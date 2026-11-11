/**
 * Brand and business configuration.
 *
 * Anything that is a *business fact* — a phone number, an address, opening
 * hours, a delivery zone — comes from the environment. If it has not been
 * configured, the field is null and the UI omits it entirely rather than
 * showing an invented value.
 */

const env = (key) => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : null;
};

export const BRAND = {
  name: env('REACT_APP_BRAND_NAME') || 'Afia Food Hub',
  tagline: 'Real Ghanaian food, cooked to order and delivered hot.',
  shortDescription:
    'Authentic Ghanaian dishes — jollof, banku and okra, fufu and light soup, waakye and kenkey — made fresh to order and delivered across Accra.',
  locale: 'en-GH',
  currency: 'GH₵',
};

export const BUSINESS = {
  supportPhone: env('REACT_APP_SUPPORT_PHONE'),
  supportEmail: env('REACT_APP_SUPPORT_EMAIL'),
  address: env('REACT_APP_BUSINESS_ADDRESS'),
  hours: env('REACT_APP_BUSINESS_HOURS'),
  deliveryZones: env('REACT_APP_DELIVERY_ZONES'),
  social: {
    instagram: env('REACT_APP_INSTAGRAM_URL'),
    x: env('REACT_APP_X_URL'),
    facebook: env('REACT_APP_FACEBOOK_URL'),
  },
};

export const PAYMENT_METHODS = [
  {
    id: 'mtn_momo',
    label: 'MTN Mobile Money',
    shortLabel: 'MTN MoMo',
    provider: 'paystack',
    description: 'Pay with your MTN Mobile Money wallet',
  },
  {
    id: 'telecel_cash',
    label: 'Telecel Cash',
    shortLabel: 'Telecel Cash',
    provider: 'paystack',
    description: 'Pay with your Telecel Cash wallet',
  },
  {
    id: 'airteltigo_money',
    label: 'AirtelTigo Money',
    shortLabel: 'AirtelTigo',
    provider: 'paystack',
    description: 'Pay with your AirtelTigo Money wallet',
  },
  {
    id: 'card',
    label: 'Debit or credit card',
    shortLabel: 'Card',
    provider: 'paystack',
    description: 'Visa and Mastercard accepted',
  },
  {
    id: 'cash',
    label: 'Cash on delivery',
    shortLabel: 'Cash',
    provider: 'cod',
    description: 'Pay when your food arrives',
  },
];

export const ORDER_STATUS = {
  placed: { label: 'Placed', tone: 'neutral', description: 'We have received your order.' },
  confirmed: { label: 'Confirmed', tone: 'accent', description: 'The kitchen has confirmed your order.' },
  preparing: { label: 'Preparing', tone: 'warning', description: 'Your food is being cooked right now.' },
  ready: { label: 'Ready', tone: 'warning', description: 'Your order is packed and waiting for the rider.' },
  out_for_delivery: { label: 'Out for delivery', tone: 'accent', description: 'Your order is on its way.' },
  delivered: { label: 'Delivered', tone: 'success', description: 'Your order has been delivered. Enjoy your meal!' },
  cancelled: { label: 'Cancelled', tone: 'danger', description: 'This order has been cancelled.' },
};

export const ORDER_STATUS_FLOW = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
];

export const PAYMENT_STATUS = {
  pending: { label: 'Payment pending', tone: 'warning' },
  pending_cod: { label: 'Pay on delivery', tone: 'neutral' },
  authorized: { label: 'Payment authorised', tone: 'accent' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Payment failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export default BRAND;
