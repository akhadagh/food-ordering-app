import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { unprocessable } from '../utils/errors.js';

/**
 * Hubtel adapter (alternative Ghanaian provider).
 *
 * Follows the same interface as the Paystack adapter so nothing else in the
 * application changes when the provider does.
 *
 * NOTE: Hubtel requires a merchant account and API credentials. Until those
 * are supplied the application keeps PAYMENT_PROVIDER=disabled and offers
 * Cash on Delivery only - it never simulates a successful payment.
 */

const API = env.hubtelApiBase;

let cachedToken = null;

async function authenticate() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  if (!env.hubtelClientId || !env.hubtelClientSecret) {
    throw unprocessable('Online payments are not configured right now.');
  }

  const response = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.hubtelClientId,
      client_secret: env.hubtelClientSecret,
      grant_type: 'client_credentials',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    logger.error('hubtel.auth', { status: response.status, message: payload.message });
    throw unprocessable('Online payments are not configured right now.');
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
  return cachedToken.value;
}

export const hubtel = {
  id: 'hubtel',

  isConfigured() {
    return Boolean(env.hubtelClientId && env.hubtelClientSecret && env.hubtelMerchantId);
  },

  async initialise({ reference, amountMinor, email, phone, callbackUrl, metadata = {} }) {
    if (!this.isConfigured()) {
      throw unprocessable('Online payments are not configured right now.');
    }
    const token = await authenticate();

    const response = await fetch(`${API}/payments/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant_id: env.hubtelMerchantId,
        reference,
        amount: (amountMinor / 100).toFixed(2),
        currency: 'GHS',
        customer: { email, phone },
        redirect_url: callbackUrl,
        description: 'Afia Food Hub order',
        metadata,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data) {
      logger.error('hubtel.initialise', { status: response.status, message: payload.message });
      throw unprocessable(payload.message || 'We could not start the payment. Please try again.');
    }

    return {
      provider: 'hubtel',
      reference: payload.data.reference || reference,
      authorizationUrl: payload.data.checkout_url,
      accessCode: null,
      providerData: { reference: payload.data.reference || reference },
    };
  },

  async verify(reference) {
    if (!this.isConfigured()) {
      throw unprocessable('Online payments are not configured right now.');
    }
    const token = await authenticate();

    const response = await fetch(
      `${API}/payments/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.data) {
      throw unprocessable(payload.message || 'We could not verify that payment.');
    }

    const data = payload.data;
    return {
      reference: data.reference,
      status: data.status === 'SUCCESS' ? 'success' : data.status === 'FAILED' ? 'failed' : 'ongoing',
      amount: Math.round(Number(data.amount || 0) * 100),
      currency: data.currency || 'GHS',
      paidAt: data.paid_at || null,
      channel: data.payment_method || null,
      raw: data,
    };
  },

  verifyWebhookSignature(rawBody, signature) {
    if (!env.hubtelClientSecret) return false;
    if (!signature) return false;
    const expected = crypto
      .createHmac('sha256', env.hubtelClientSecret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  },
};

export default hubtel;
