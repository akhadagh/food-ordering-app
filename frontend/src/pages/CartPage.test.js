import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CartPage from './CartPage';
import { useCart } from '../context/CartContext';
import { apiErrorMessage } from '../services/api';

jest.mock('../context/CartContext', () => ({
  useCart: jest.fn(),
}));

jest.mock('../services/api', () => ({
  apiErrorMessage: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const ITEMS = [
  {
    id: 11,
    menuItemId: 1,
    name: 'Jollof Rice',
    quantity: 2,
    customOptions: [{ option: 'Protein', value: 'Chicken' }],
    specialInstructions: 'Extra spicy',
  },
  {
    id: 12,
    menuItemId: 3,
    name: 'Palm Wine',
    quantity: 1,
    customOptions: [],
    specialInstructions: '',
  },
];

const QUOTE = {
  subtotal: '90.00',
  delivery_fee: '5.00',
  discount: '0.00',
  total: '95.00',
  items: [
    { menu_item_id: 1, line_total: '80.00', image_url: '/brand/food/jollof-rice.jpg' },
    { menu_item_id: 3, line_total: '10.00', image_url: '/brand/food/palm-wine.jpg' },
  ],
};

const cartState = (overrides = {}) => ({
  cart: { id: 'cart-1', items: ITEMS, quote: QUOTE, issues: [] },
  items: ITEMS,
  quote: QUOTE,
  loading: false,
  error: null,
  reload: jest.fn(),
  updateQuantity: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderPage = (overrides) => {
  const state = cartState(overrides);
  useCart.mockReturnValue(state);
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );
  return state;
};

describe('CartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiErrorMessage.mockImplementation((err, fallback) => fallback);
  });

  it('shows the dishes that are in the cart', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Jollof Rice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Palm Wine' })).toBeInTheDocument();
  });

  it('shows the customisation and the note the customer chose', () => {
    renderPage();

    expect(screen.getByText('Protein: Chicken')).toBeInTheDocument();
    expect(screen.getByText(/Extra spicy/)).toBeInTheDocument();
  });

  it('prices every line from the server quote', () => {
    renderPage();

    // The line price is the server's, not the browser's.
    expect(screen.getByText(/GH₵\s*80\.00/)).toBeInTheDocument();
    expect(screen.getByText(/GH₵\s*10\.00/)).toBeInTheDocument();
  });

  it('shows the totals the server calculated', () => {
    renderPage();

    const summary = screen.getByRole('heading', { name: /order summary/i }).closest('div');
    expect(summary).toHaveTextContent('90.00');
    expect(summary).toHaveTextContent('95.00');
  });

  it('shows a discount when the server gave one', () => {
    renderPage({
      quote: { ...QUOTE, discount: '10.00', total: '85.00' },
    });

    const summary = screen.getByRole('heading', { name: /order summary/i }).closest('div');
    expect(summary).toHaveTextContent('Discount');
    expect(summary).toHaveTextContent('10.00');
  });

  it('asks the server to change a quantity', async () => {
    const state = renderPage();

    await userEvent.click(screen.getByRole('button', { name: /increase quantity of jollof rice/i }));

    await waitFor(() => expect(state.updateQuantity).toHaveBeenCalledWith(11, 3));
  });

  it('asks the server to remove a dish', async () => {
    const state = renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /remove palm wine from your cart/i })
    );

    await waitFor(() => expect(state.removeItem).toHaveBeenCalledWith(12));
  });

  it('says the cart is empty when it is', () => {
    renderPage({ items: [], cart: { id: 'cart-1', items: [], quote: null } });

    expect(screen.getByRole('heading', { name: /your cart is empty/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse the menu/i })).toHaveAttribute('href', '/menu');
  });

  it('says the cart could not be loaded when it could not', () => {
    renderPage({ items: [], error: 'We could not reach Afia Food Hub.' });

    expect(screen.getByRole('alert')).toHaveTextContent('We could not load your cart');
    expect(screen.getByRole('alert')).toHaveTextContent('We could not reach Afia Food Hub.');
  });

  it('explains a cart the kitchen cannot price', () => {
    renderPage({
      cart: {
        id: 'cart-1',
        items: ITEMS,
        quote: QUOTE,
        issues: [{ code: 'cart_invalid', message: 'Choose a protein for your jollof rice.' }],
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Choose a protein for your jollof rice.');
  });

  it('offers the way to the checkout', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /proceed to checkout/i })).toHaveAttribute(
      'href',
      '/checkout'
    );
  });
});
