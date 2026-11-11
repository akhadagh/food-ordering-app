import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { badRequest, notFound, unprocessable } from '../utils/errors.js';

/**
 * Paystack adapter.
 *
 * Paystack natively supports MTN Mobile Money, Telecel Cash, AirtelTigo
 * Money and cards in Ghana, so it covers the whole target market with one
 * integration.
 *
 * Amounts are sent in pesewas (the minor unit of GHS), which is exactly the
 * integer minor-unit representation used everywhere else in this codebase.
 */

const API = env.paystackApiBase;

async function call(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Paystack returned a non-JSON response (${response.status}).`);
  }

  if (!response.ok || payload.status === false) {
    const message = payload.message || `Paystack request failed (${response.status}).`;
    logger.warn('paystack.error', { path, status: response.status, message });
    throw new unprocessable(message);
  }
  return payload.data;
}

export const paystack = {
  id: 'paystack',

  isConfigured() {
    return Boolean(env.paystackSecretKey && env.paystackWebhookSecret);
  },

  /**
   * Start a transaction.
   *
   * Returns the authorisation URL and the provider reference, which is stored
   * on the order so the callback can be matched to it.
   */
  async initialise({ reference, amountMinor, email, phone, callbackUrl, metadata = {} }) {
    if (!this.isConfigured()) {
      throw unprocessable('Online payments are not configured right now.');
    }

    const data = await call('/transaction/initialize', {
      method: 'POST',
      body: {
        reference,
        amount: amountMinor, // pesewas
        currency: 'GHS',
        email,
        callback_url: callbackUrl,
        channels: ['mobile_money', 'card'],
        metadata: { ...metadata, custom_fields: [{ display_name: 'Phone', variable_name: 'phone', value: phone || '' }] },
      },
    });

    return {
      provider: 'paystack',
      reference: data.reference || reference,
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      providerData: { reference: data.reference || reference },
    };
  },

  /** Ask the provider whether a transaction actually succeeded. */
  async verify(reference) {
    if (!this.isConfigured()) {
      throw unprocessable('Online payments are not configured right now.');
    }
    try {
      const data = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
      return {
        reference: data.reference,
        status: data.status, // 'success' | 'failed' | 'ongoing'
        amount: data.amount,
        currency: data.currency,
        reference_on_provider: data.reference,
        paidAt: data.paid_at ? new Date(data.paid_at).toISOString() : null,
        channel: data.channel || null,
        raw: { status: data.status, gateway_response: data.gateway_response },
      };
    } catch (err) {
      if (err.status === 404) {
        throw notFound('That payment reference was not found.');
      }
      throw err;
    }
  },

  /**
   * Verify a webhook signature.
   *
   * The signature is checked against the RAW request body before any state
   * is changed - a callback that is not authentic is never trusted.
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!env.paystackWebhookSecret) {
      logger.error('paystack.webhook', { message: 'PAYSTACK_WEBHOOK_SECRET is not configured.' });
      return false;
    }
    if (!signature) return false;

    const expected = crypto
      .createHmac('sha512', env.paystackWebhookSecret)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  },
};

export default paystack;
