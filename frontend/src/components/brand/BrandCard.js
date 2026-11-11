import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The surface primitive: a bordered white panel on the bamboo background.
 * When `to` is supplied the card becomes a single large link target.
 */
export const BrandCard = ({
  children,
  to,
  className = '',
  interactive = false,
  ...rest
}) => {
  const classes = [
    interactive ? 'card-interactive' : 'card',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={`${classes} block`} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};

export default BrandCard;
