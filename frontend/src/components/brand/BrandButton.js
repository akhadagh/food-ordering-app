import React from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from './BrandLoader';

/**
 * The single button primitive for the whole application.
 *
 * variant : primary | secondary | ghost | danger
 * size    : sm | md | lg
 * to      : render as a react-router <Link>
 * loading : shows a spinner and disables the control
 */
const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'px-8 py-3.5 text-base',
};

export const BrandButton = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  to,
  href,
  type = 'button',
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading && <Spinner size={size === 'sm' ? 14 : 18} />}
      {children}
    </>
  );

  if (to && !loading && !disabled) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && !loading && !disabled) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
};

export default BrandButton;
