/**
 * Money handling.
 *
 * All monetary values are stored in PostgreSQL as `numeric(12,2)` and are
 * handled here as **integer minor units** (pesewas) so that no rounding
 * error can accumulate. The frontend never supplies a price - see
 * services/pricing.service.js.
 */

export const MINOR_UNITS = 100;

/** "555.00" | 555 | 555.5 | null -> 55500 (integer minor units) */
export function toMinor(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * MINOR_UNITS);
  }
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return 0;
  const negative = text.startsWith('-');
  const abs = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = abs.split('.');
  const padded = (fraction + '00').slice(0, 2);
  const minor = Number(whole) * MINOR_UNITS + Number(padded);
  return negative ? -minor : minor;
}

/** 55500 -> "555.00" */
export function toDecimal(minor) {
  const n = Number(minor) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const whole = Math.floor(abs / MINOR_UNITS);
  const fraction = abs % MINOR_UNITS;
  return `${sign}${whole}.${String(fraction).padStart(2, '0')}`;
}

/** 55500 -> 555 (a float, for display only - never for arithmetic) */
export function toNumber(minor) {
  return (Number(minor) || 0) / MINOR_UNITS;
}

/** Round to the nearest minor unit. */
export function roundMinor(value) {
  return Math.round(value);
}

/** Format for display: 55500 -> "GH₵ 555.00" */
export function formatMoney(minor, currency = 'GH₵') {
  return `${currency} ${toDecimal(minor)}`;
}

/**
 * Percentage discount on a minor-unit amount, rounded to the nearest minor
 * unit (never floating point drift on the total).
 */
export function applyPercentage(amountMinor, percent) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return Math.round((amountMinor * pct) / 100);
}

export default { toMinor, toDecimal, toNumber, roundMinor, formatMoney, applyPercentage, MINOR_UNITS };
