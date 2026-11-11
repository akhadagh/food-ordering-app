import React from 'react';

/**
 * Money display. PostgreSQL numeric columns arrive as strings, so every
 * monetary value is normalised here in one place.
 *
 *   <BrandPrice amount={45} />        → GH₵ 45.00
 *   <BrandPrice amount="555.00" />    → GH₵ 555.00
 *   <BrandPrice amount={45} size="lg" />
 */
export const formatCedi = (value) => {
  const n = typeof value === 'number' ? value : parseFloat(value ?? 0);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

export const BrandPrice = ({
  amount,
  size = 'md',
  className = '',
  currency = 'GH₵',
  tone = 'primary',
}) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };
  const tones = {
    primary: 'text-primary-600',
    accent: 'text-accent-700',
    ink: 'text-bamboo-900',
    muted: 'text-bamboo-600',
    light: 'text-white',
  };
  return (
    <span
      className={`brand-price whitespace-nowrap ${sizes[size] || sizes.md} ${
        tones[tone] || tones.primary
      } ${className}`}
    >
      {currency} {formatCedi(amount)}
    </span>
  );
};

export default BrandPrice;
