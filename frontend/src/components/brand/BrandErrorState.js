import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, WifiOff, ServerCrash } from 'lucide-react';

/**
 * Branded error / not-found / offline state.
 */
const ICONS = {
  error: AlertTriangle,
  offline: WifiOff,
  server: ServerCrash,
};

export const BrandErrorState = ({
  variant = 'error',
  title = 'Something went wrong',
  description = 'We could not load this page. Please try again in a moment.',
  actionLabel = 'Try again',
  onAction,
  linkTo,
  linkLabel,
}) => {
  const Icon = ICONS[variant] || AlertTriangle;
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-20 text-center"
      role="alert"
    >
      <div
        className={`mb-6 flex h-24 w-24 items-center justify-center rounded-3xl ${
          variant === 'offline' ? 'bg-gold-50' : 'bg-danger-50'
        }`}
      >
        <Icon
          size={40}
          className={variant === 'offline' ? 'text-accent-700' : 'text-danger-600'}
          aria-hidden="true"
        />
      </div>
      <h2 className="font-display text-display-sm text-bamboo-900">{title}</h2>
      <p className="mt-2 max-w-md text-bamboo-600 text-pretty">{description}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {onAction && (
          <button type="button" onClick={onAction} className="btn-primary">
            {actionLabel}
          </button>
        )}
        {linkTo && (
          <Link to={linkTo} className="btn-secondary">
            {linkLabel || 'Go home'}
          </Link>
        )}
      </div>
    </div>
  );
};

export default BrandErrorState;
