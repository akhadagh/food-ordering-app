import React from 'react';
import { render, screen } from '@testing-library/react';
import BrandPrice, { formatCedi } from './BrandPrice';

describe('formatCedi', () => {
  it('formats a number', () => {
    expect(formatCedi(45)).toBe('45.00');
  });

  it('formats the string a numeric column arrives as', () => {
    // PostgreSQL numeric columns arrive as strings. A price that renders as
    // "NaN" on the screen is a bug the customer sees.
    expect(formatCedi('555.00')).toBe('555.00');
  });

  it('pads a whole number to two decimals', () => {
    expect(formatCedi(12)).toBe('12.00');
  });

  it('treats nothing as zero', () => {
    expect(formatCedi(null)).toBe('0.00');
    expect(formatCedi(undefined)).toBe('0.00');
    expect(formatCedi('')).toBe('0.00');
  });

  it('treats nonsense as zero rather than showing NaN', () => {
    expect(formatCedi('not a price')).toBe('0.00');
    expect(formatCedi(Number.NaN)).toBe('0.00');
  });
});

describe('BrandPrice', () => {
  it('shows the amount in cedis', () => {
    render(<BrandPrice amount="40.00" />);

    expect(screen.getByText(/GH₵\s*40\.00/)).toBeInTheDocument();
  });

  it('shows a zero total as a price, not as a blank', () => {
    render(<BrandPrice amount={0} />);

    expect(screen.getByText(/GH₵\s*0\.00/)).toBeInTheDocument();
  });
});
