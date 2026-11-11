import React from 'react';

/**
 * The Afia Food Hub logo.
 *
 * variant : horizontal | stacked | icon | wordmark
 * theme   : light  (default, for light backgrounds)
 *           dark   (for dark backgrounds)
 *           mono   (single colour, inherits currentColor)
 * size    : any CSS length — the asset scales cleanly.
 */
const ASSETS = {
  horizontal: {
    light: '/brand/logo/afia-logo-horizontal.svg',
    dark: '/brand/logo/afia-logo-horizontal-dark.svg',
    mono: '/brand/logo/afia-logo-horizontal-mono.svg',
  },
  stacked: {
    light: '/brand/logo/afia-logo-stacked.svg',
    dark: '/brand/logo/afia-logo-stacked-dark.svg',
    mono: '/brand/logo/afia-logo-stacked-mono.svg',
  },
  icon: {
    light: '/brand/logo/afia-icon.svg',
    dark: '/brand/logo/afia-icon-dark.svg',
    mono: '/brand/logo/afia-icon-mono.svg',
  },
  wordmark: {
    light: '/brand/logo/afia-wordmark.svg',
    dark: '/brand/logo/afia-wordmark.svg',
    mono: '/brand/logo/afia-wordmark.svg',
  },
};

const DEFAULT_HEIGHT = {
  horizontal: 36,
  stacked: 72,
  icon: 32,
  wordmark: 32,
};

export const BrandLogo = ({
  variant = 'horizontal',
  theme = 'light',
  height,
  className = '',
  title = 'Afia Food Hub',
}) => {
  const src = ASSETS[variant]?.[theme] || ASSETS.horizontal.light;
  const h = height || DEFAULT_HEIGHT[variant] || 36;

  return (
    <img
      src={src}
      alt={title}
      height={h}
      className={`block w-auto select-none ${className}`}
      style={{ height: typeof h === 'number' ? `${h}px` : h }}
      draggable="false"
    />
  );
};

export default BrandLogo;
