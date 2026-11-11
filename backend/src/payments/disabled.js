import { unprocessable } from '../utils/errors.js';

/**
 * The "no provider configured" adapter.
 *
 * Used when PAYMENT_PROVIDER=disabled. It refuses every online payment
 * attempt rather than pretending one succeeded, so the application can only
 * offer Cash on Delivery until real credentials are supplied.
 */
export const disabled = {
  id: 'disabled',

  isConfigured() {
    return false;
  },

  async initialise() {
    throw unprocessable(
      'Online payment is not available right now. Please choose cash on delivery.'
    );
  },

  async verify() {
    throw unprocessable('Online payment is not available right now.');
  },

  verifyWebhookSignature() {
    return false;
  },
};

export default disabled;
