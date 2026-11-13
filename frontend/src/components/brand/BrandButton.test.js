import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BrandButton from './BrandButton';

const renderButton = (props = {}) =>
  render(
    <MemoryRouter>
      <BrandButton {...props}>Order now</BrandButton>
    </MemoryRouter>
  );

describe('BrandButton', () => {
  it('renders a button with an accessible name', () => {
    renderButton();

    const button = screen.getByRole('button', { name: /order now/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn-primary');
  });

  it('applies the variant class', () => {
    renderButton({ variant: 'danger' });

    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('falls back to the primary variant for an unknown one', () => {
    renderButton({ variant: 'sparkly' });

    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('is disabled while it is loading and says so', () => {
    renderButton({ loading: true });

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('calls the handler when it is pressed', async () => {
    const onClick = jest.fn();
    renderButton({ onClick });

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call the handler while it is loading', async () => {
    const onClick = jest.fn();
    renderButton({ loading: true, onClick });

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders as a link when it is given a destination', () => {
    renderButton({ to: '/menu' });

    const link = screen.getByRole('link', { name: /order now/i });
    expect(link).toHaveAttribute('href', '/menu');
  });

  it('renders as a plain button when it is loading, even with a destination', () => {
    renderButton({ to: '/menu', loading: true });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders an anchor when it is given an external address', () => {
    renderButton({ href: 'https://example.test/menu' });

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.test/menu');
  });
});
