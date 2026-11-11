import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { paystack } from './paystack.js';
import { hubtel } from './hubtel.js';
import { disabled } from './disabled.js';

const PROVIDERS = { paystack, hubtel, disabled };

/**
 * Resolve the configured payment provider.
 *
 * If the configured provider is missing its credentials the application falls
 * back to `disabled` rather than starting an online payment it cannot
 * complete. The checkout then offers Cash on Delivery only.
 */
export function getProvider() {
  const chosen = PROVIDERS[env.paymentProvider] || disabled;
  if (chosen.id !== 'disabled' && !chosen.isConfigured()) {
    logger.warn('payment.provider_not_configured', { provider: chosen.id });
    return disabled;
  }
  return chosen;
}

/** The payment methods the checkout should offer right now. */
export function availablePaymentMethods() {
  const provider = getProvider();
  if (provider.id === 'disabled') {
    return [{ id: 'cash', label: 'Cash on delivery', provider: 'cod', online: false }];
  }
  const methods = [
    { id: 'mtn_momo', label: 'MTN Mobile Money', provider: provider.id, online: true },
    { id: 'telecel_cash', label: 'Telecel Cash', provider: provider.id, online: true },
    { id: 'airteltigo_money', label: 'AirtelTigo Money', provider: provider.id, online: true },
    { id: 'card', label: 'Debit or credit card', provider: provider.id, online: true },
  ];
  methods.push({ id: 'cash', label: 'Cash on delivery', provider: 'cod', online: false });
  return methods;
}

export { paystack, hubtel, disabled };
export default { getProvider, availablePaymentMethods };
