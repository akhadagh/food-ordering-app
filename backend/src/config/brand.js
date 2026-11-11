import { env } from './env.js';

/**
 * Business identity shared by the API (emails, receipts, the assistant).
 *
 * Every value is a business fact supplied through the environment. If one is
 * not configured it stays null and the API omits it rather than returning a
 * placeholder that could be mistaken for a real contact detail.
 */
export const BRAND = {
  name: 'Afia Food Hub',
  tagline: 'Real Ghanaian food, cooked to order and delivered hot.',
  shortDescription:
    'Authentic Ghanaian dishes made fresh to order and delivered across Accra.',
  currency: env.currency,
  currencySymbol: 'GH₵',
};

export const BUSINESS = {
  supportPhone: env.supportPhone || null,
  supportEmail: env.supportEmail || null,
  address: env.businessAddress || null,
  hours: env.businessHours || null,
  deliveryZones: env.deliveryZones,
  paymentMerchantName: env.paymentMerchantName,
  paymentMerchantPhone: env.paymentMerchantPhone || null,
  contactLine() {
    if (BUSINESS.supportPhone) return `Call us on ${BUSINESS.supportPhone} and a person will pick up.`;
    if (BUSINESS.supportEmail) return `Email us at ${BUSINESS.supportEmail}.`;
    return 'You can reach the team through the contact details on our website.';
  },
};

export default BRAND;
