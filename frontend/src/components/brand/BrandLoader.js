import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * The branded loading screen: the Afia emblem with a slow steam pulse.
 * Used for full-page loads; inline spinners use <Spinner />.
 */
export const BrandLoader = ({ label = 'Loading…', size = 72, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center gap-5 py-20 ${className}`}
    role="status"
    aria-live="polite"
  >
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path
          d="M32 14 C27 10 37 7 32 2"
          stroke="#DE9710"
          strokeWidth="3.4"
          className="brand-mark-steam"
        />
        <path d="M18 41 L32 14 L46 41" stroke="#C4422B" strokeWidth="5.4" />
        <path d="M22.7 32 L41.3 32" stroke="#C4422B" strokeWidth="4.6" />
        <path d="M11 41 L53 41" stroke="#C4422B" strokeWidth="5" />
        <path d="M11 41 A21 16 0 0 0 53 41" stroke="#C4422B" strokeWidth="5" />
      </g>
    </svg>
    <p className="text-sm font-medium text-bamboo-600">{label}</p>
  </div>
);

/** Small inline spinner for buttons and inline loading states. */
export const Spinner = ({ size = 18, className = '' }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />
);

export default BrandLoader;
