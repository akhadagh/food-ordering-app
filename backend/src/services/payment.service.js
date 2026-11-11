import { query, withTransaction } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { badRequest, notFound, unprocessable } from '../utils/errors.js';
import { getProvider, availablePaymentMethods } from '../payments/index.js';
import { toMinor } from '../utils/money.js';

const ONLINE_METHODS = new Set(['mtn_momo', 'telecel_cash', 'airteltigo_money', 'card']);

/**
 * Payment lifecycle.
 *
 * Rules enforced here:
 *  - An order is NEVER marked paid from a client request. Only a verified
 *    provider callback (or an explicit provider verification call) can do it.
 *  - The amount in the callback must equal the server-computed order total.
 *  - Replayed callbacks are idempotent.
 *  - Payment state is independent of order state.
 */

export async function startPayment(order, user) {
  const provider = getProvider();
  const method = order.payment_method;

  if (!ONLINE_METHODS.has(method)) {
    throw badRequest('That payment method does not need online authorisation.');
  }
  if (provider.id === 'disabled') {
    throw unprocessable(
      'Online payment is not available right now. Please choose cash on delivery.'
    );
  }

  const reference = order.payment_reference || `AFIA-${order.id}-${Date.now()}`;
  const amountMinor = toMinor(order.total);

  const result = await provider.initialise({
    reference,
    amountMinor,
    email: user.email,
    phone: order.customer_phone,
    callbackUrl: `${env.publicAppUrl}/orders/${order.id}?payment=return`,
    metadata: { orderId: order.id, userId: user.id },
  });

  await query(
    `UPDATE orders
        SET payment_provider = $2, payment_reference = $3, payment_channel = $4,
            payment_status = 'pending', payment_amount = $5
      WHERE id = $1`,
    [order.id, provider.id, result.reference, method, amountMinor]
  );

  return {
    provider: provider.id,
    reference: result.reference,
    authorizationUrl: result.authorizationUrl,
    accessCode: result.accessCode,
    amount: amountMinor / 100,
    currency: env.currency,
  };
}

/**
 * Apply a verified provider result to an order.
 *
 * `verified` must be the output of a provider verification call - the raw
 * webhook body is never passed straight into this function.
 */
export async function applyVerifiedPayment({
  reference,
  status,
  amountMinor,
  channel,
  paidAt,
  raw,
}) {
  const { rows } = await query(
    'SELECT id, total, payment_status, payment_method FROM orders WHERE payment_reference = $1',
    [reference]
  );
  const order = rows[0];
  if (!order) throw notFound('No order matches that payment reference.');

  // Idempotency: an already-paid order is not processed twice.
  if (order.payment_status === 'paid' || order.payment_status === 'refunded') {
    logger.info('payment.duplicate_ignored', { orderId: order.id, reference });
    return { id: order.id, paymentStatus: order.payment_status, duplicate: true };
  }

  // The provider amount must match what the server computed.
  const expected = toMinor(order.total);
  if (amountMinor !== null && amountMinor !== undefined && Number(amountMinor) !== expected) {
    logger.error('payment.amount_mismatch', {
      orderId: order.id,
      reference,
      expected,
      received: amountMinor,
    });
    await query(
      `UPDATE orders SET payment_status = 'failed', payment_failure_reason = $2 WHERE id = $1`,
      [order.id, 'Amount mismatch between the order and the payment provider.']
    );
    throw unprocessable('The payment amount did not match this order.');
  }

  const nextStatus = status === 'success' ? 'paid' : status === 'failed' ? 'failed' : 'pending';

  return withTransaction(async (client) => {
    await client.query(
      `UPDATE orders
          SET payment_status = $2,
              payment_channel = COALESCE($3, payment_channel),
              paid_at = CASE WHEN $2 = 'paid' THEN COALESCE($4, now()) ELSE paid_at END,
              payment_failure_reason = CASE WHEN $2 = 'failed' THEN $5 ELSE NULL END
        WHERE id = $1`,
      [
        order.id,
        nextStatus,
        channel || null,
        paidAt || null,
        status === 'failed' ? 'The payment was declined or failed.' : null,
      ]
    );

    if (nextStatus === 'paid') {
      await client.query(
        `INSERT INTO order_status_history (order_id, status, note)
         VALUES ($1, o.status, $2)`,
        [order.id, 'Payment received.']
      );
    }

    return { id: order.id, paymentStatus: nextStatus, raw };
  });
}

/**
 * Handle an inbound provider webhook.
 *
 * The raw body is required: the signature is computed over the exact bytes
 * the provider sent. The signature is verified BEFORE anything is read from
 * the payload, and the payment is then confirmed against the provider's own
 * verification endpoint rather than trusting the webhook body.
 */
export async function handleWebhook({ providerId, rawBody, signature }) {
  const provider = getProvider();
  if (provider.id === 'disabled' || provider.id !== providerId) {
    throw unprocessable('Unknown payment provider.');
  }

  const verified = provider.verifyWebhookSignature(rawBody, signature);
  if (!verified) {
    logger.warn('payment.webhook_signature_rejected', { providerId });
    throw unprocessable('Invalid webhook signature.');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw badRequest('Invalid webhook payload.');
  }

  const reference = payload?.data?.reference || payload?.reference;
  if (!reference) throw badRequest('The webhook did not include a payment reference.');

  // Confirm against the provider directly. The webhook body alone is never
  // trusted to decide whether money moved.
  const confirmation = await provider.verify(reference);

  return applyVerifiedPayment({
    reference,
    status: confirmation.status,
    amountMinor: confirmation.amount,
    channel: confirmation.channel,
    paidAt: confirmation.paidAt,
    raw: confirmation.raw,
  });
}

/** Manually re-check a pending payment with the provider. */
export async function refreshPayment(order) {
  const provider = getProvider();
  if (provider.id === 'disabled') {
    throw unprocessable('Online payment is not available right now.');
  }
  if (!order.payment_reference) {
    throw unprocessable('This order has no payment reference to check.');
  }
  const confirmation = await provider.verify(order.payment_reference);
  return applyVerifiedPayment({
    reference: order.payment_reference,
    status: confirmation.status,
    amountMinor: confirmation.amount,
    channel: confirmation.channel,
    paidAt: confirmation.paidAt,
    raw: confirmation.raw,
  });
}

export async function refundPayment(orderId, { reason } = {}) {
  const { rows } = await query('SELECT id, payment_status FROM orders WHERE id = $1', [orderId]);
  const order = rows[0];
  if (!order) throw notFound('Order not found.');
  if (order.payment_status !== 'paid') {
    throw unprocessable('Only a paid order can be refunded.');
  }

  // The actual refund is executed in the provider dashboard/API by finance;
  // the platform records the state so the order history stays truthful.
  await query(
    `UPDATE orders
        SET payment_status = 'refunded', refunded_at = now(), payment_failure_reason = $2
      WHERE id = $1`,
    [orderId, reason ? String(reason).slice(0, 300) : 'Refunded']
  );

  return { id: orderId, paymentStatus: 'refunded' };
}

export { availablePaymentMethods };
export default {
  startPayment,
  applyVerifiedPayment,
  handleWebhook,
  refreshPayment,
  refundPayment,
  availablePaymentMethods,
};
