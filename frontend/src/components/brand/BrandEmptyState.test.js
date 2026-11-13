import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrandEmptyState from './BrandEmptyState';
import BrandErrorState from './BrandErrorState';

const renderEmpty = (props = {}) =>
  render(
    <MemoryRouter>
      <BrandEmptyState {...props} />
    </MemoryRouter>
  );

describe('BrandEmptyState', () => {
  it('shows the title', () => {
    renderEmpty({ title: 'Your cart is empty' });

    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });

  it('shows the description', () => {
    renderEmpty({ title: 'Nothing here', description: 'Add a dish to get started.' });

    expect(screen.getByText('Add a dish to get started.')).toBeInTheDocument();
  });

  it('offers the action as a link when it has a destination', () => {
    renderEmpty({ title: 'Nothing here', actionLabel: 'Browse the menu', actionTo: '/menu' });

    expect(screen.getByRole('link', { name: 'Browse the menu' })).toHaveAttribute('href', '/menu');
  });

  it('offers the action as a button when it has a handler', async () => {
    const onAction = jest.fn();
    renderEmpty({ title: 'Nothing here', actionLabel: 'Try again', onAction });

    screen.getByRole('button', { name: 'Try again' }).click();
    expect(onAction).toHaveBeenCalled();
  });

  it('offers no action when there is nothing to do', () => {
    renderEmpty({ title: 'Nothing here' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('BrandErrorState', () => {
  const renderError = (props = {}) =>
    render(
      <MemoryRouter>
        <BrandErrorState {...props} />
      </MemoryRouter>
    );

  it('is announced as an alert', () => {
    renderError({ title: 'We could not load this page' });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We could not load this page');
  });

  it('shows the retry action', () => {
    const onAction = jest.fn();
    renderError({ title: 'Something went wrong', actionLabel: 'Try again', onAction });

    screen.getByRole('button', { name: 'Try again' }).click();
    expect(onAction).toHaveBeenCalled();
  });

  it('shows a link home when there is one', () => {
    renderError({ title: 'Something went wrong', linkTo: '/', linkLabel: 'Go home' });

    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });
});
