import React from 'react';

/**
 * Semantic status chip.
 * tone: success | warning | danger | accent | neutral
 */
const TONES = {
  success: 'bg-garden-50 text-garden-700',
  warning: 'bg-gold-50 text-gold-700',
  danger: 'bg-danger-50 text-danger-700',
  accent: 'bg-clay-50 text-clay-700',
  neutral: 'bg-bamboo-100 text-bamboo-700',
};

export const BrandBadge = ({ tone = 'neutral', children, className = '', dot = false }) => (
  <span className={`badge ${TONES[tone] || TONES.neutral} ${className}`}>
    {dot && (
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
    )}
    {children}
  </span>
);

export default BrandBadge;
