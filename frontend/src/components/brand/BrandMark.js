import React from 'react';

/**
 * The inline "Afia Bowl" emblem — a bold A whose crossbar is the rim of a
 * bowl, with a rising steam stroke. Drawn inline so it can take the current
 * text colour and animate the steam.
 */
export const BrandMark = ({
  size = 32,
  color = 'currentColor',
  steam = '#DE9710',
  className = '',
  title = 'Afia Food Hub',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    role="img"
    aria-label={title}
    className={className}
  >
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path
        d="M32 14 C27 10 37 7 32 2"
        stroke={steam}
        strokeWidth="3.4"
        className="brand-mark-steam"
      />
      <path d="M18 41 L32 14 L46 41" stroke={color} strokeWidth="5.4" />
      <path d="M22.7 32 L41.3 32" stroke={color} strokeWidth="4.6" />
      <path d="M11 41 L53 41" stroke={color} strokeWidth="5" />
      <path d="M11 41 A21 16 0 0 0 53 41" stroke={color} strokeWidth="5" />
    </g>
  </svg>
);

export default BrandMark;
