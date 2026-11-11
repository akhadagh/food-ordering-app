import React from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';

/**
 * Branded empty state — used for an empty cart, no orders, no results.
 */
export const BrandEmptyState = ({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  icon: Icon,
  size = 64,
}) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-clay-50">
      {Icon ? (
        <Icon size={size * 0.5} className="text-primary-500" aria-hidden="true" />
      ) : (
        <BrandMark size={size * 0.7} color="#C4422B" steam="#DE9710" />
      )}
    </div>
    <h3 className="font-display text-display-sm text-bamboo-900">{title}</h3>
    {description && (
      <p className="mt-2 max-w-sm text-bamboo-600 text-pretty">{description}</p>
    )}
    {(actionLabel && (actionTo || onAction)) && (
      <div className="mt-7">
        {actionTo ? (
          <Link to={actionTo} className="btn-primary">
            {actionLabel}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className="btn-primary">
            {actionLabel}
          </button>
        )}
      </div>
    )}
  </div>
);

export default BrandEmptyState;
