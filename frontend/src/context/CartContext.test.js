import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart } from './CartContext';
import { cartAPI, apiErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';

jest.mock('../services/api', () => ({
  cartAPI: {
    get: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  apiErrorMessage: jest.fn(() => 'We could not load your cart.'),
}));

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

const CART = {
  id: 'cart-1',
  items: [
    {
      id: 11,
      menuItemId: 1,
      name: 'Jollof Rice',
      quantity: 2,
      customOptions: [],
      specialInstructions: '',
    },
    {
      id: 12,
      menuItemId: 3,
      name: 'Banku with Okra Soup',
      quantity: 1,
      customOptions: [{ option: 'Size', value: 'Large' }],
      specialInstructions: '',
    },
  ],
  quote: {
    subtotal: '90.00',
    delivery_fee: '5.00',
    discount: '0.00',
    total: '95.00',
    items: [{ menu_item_id: 1, line_total: '80.00' }],
  },
};

const Probe = () => {
  const { items, quote, loading, error, totalItems, subtotal, deliveryFee, total, addItem, updateQuantity, removeItem, clear, reload } =
    useCart();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="items">{items.length}</span>
      <span data-testid="names">{items.map((i) => i.name).join(',')}</span>
      <span data-testid="totalItems">{totalItems}</span>
      <span data-testid="subtotal">{subtotal}</span>
      <span data-testid="deliveryFee">{deliveryFee}</span>
      <span data-testid="total">{total}</span>
      <span data-testid="quoteTotal">{quote?.total ?? 'none'}</span>
      <button type="button" onClick={() => addItem({ menuItemId: 1, quantity: 1 })}>
        add
      </button>
      <button type="button" onClick={() => updateQuantity(11, 3)}>
        update
      </button>
      <button type="button" onClick={() => removeItem(11)}>
        remove
      </button>
      <button type="button" onClick={() => clear()}>
        clear
      </button>
      <button type="button" onClick={() => reload()}>
        reload
      </button>
    </div>
  );
};

const renderCart = () =>
  render(
    <CartProvider>
      <Probe />
    </CartProvider>
  );

describe('CartContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The React scripts Jest preset resets every mock before each test, so
    // the implementation has to be put back each time.
    apiErrorMessage.mockImplementation(() => 'We could not load your cart.');
    useAuth.mockReturnValue({ user: null });
    cartAPI.get.mockResolvedValue({ data: CART });
  });

  it('reads the cart from the server', async () => {
    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('items')).toHaveTextContent('2');
    expect(screen.getByTestId('names')).toHaveTextContent('Jollof Rice,Banku with Okra Soup');
  });

  it('takes every price from the server quote, not from the line', async () => {
    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('subtotal')).toHaveTextContent('90');
    expect(screen.getByTestId('deliveryFee')).toHaveTextContent('5');
    expect(screen.getByTestId('total')).toHaveTextContent('95');
  });

  it('counts the items across the lines', async () => {
    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('totalItems')).toHaveTextContent('3');
  });

  it('reports a failure to load the cart', async () => {
    cartAPI.get.mockRejectedValue({ response: { status: 500 } });

    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).not.toHaveTextContent('none');
  });

  it('re-reads the cart after a dish is added', async () => {
    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    cartAPI.addItem.mockResolvedValue({ data: {} });

    await userEvent.click(screen.getByRole('button', { name: 'add' }));

    await waitFor(() => expect(cartAPI.get).toHaveBeenCalledTimes(2));
    expect(cartAPI.addItem).toHaveBeenCalledWith({
      menuItemId: 1,
      quantity: 1,
      customOptions: [],
      specialInstructions: '',
    });
  });

  it('re-reads the cart after a quantity changes', async () => {
    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    cartAPI.updateItem.mockResolvedValue({ data: {} });

    await userEvent.click(screen.getByRole('button', { name: 'update' }));

    await waitFor(() => expect(cartAPI.updateItem).toHaveBeenCalledWith(11, 3));
    await waitFor(() => expect(cartAPI.get).toHaveBeenCalledTimes(2));
  });

  it('re-reads the cart after a dish is removed', async () => {
    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    cartAPI.removeItem.mockResolvedValue({ data: {} });

    await userEvent.click(screen.getByRole('button', { name: 'remove' }));

    await waitFor(() => expect(cartAPI.removeItem).toHaveBeenCalledWith(11));
    await waitFor(() => expect(cartAPI.get).toHaveBeenCalledTimes(2));
  });

  it('empties the cart and re-reads it', async () => {
    renderCart();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    cartAPI.clear.mockResolvedValue({ data: {} });

    await userEvent.click(screen.getByRole('button', { name: 'clear' }));

    await waitFor(() => expect(cartAPI.clear).toHaveBeenCalled());
    await waitFor(() => expect(cartAPI.get).toHaveBeenCalledTimes(2));
  });

  it('reads the cart again when the customer signs in', async () => {
    // The guest cart and the customer's cart are different records. Without
    // this the browser would keep showing the guest's copy of the cart after
    // a sign-in.
    const { rerender } = render(
      <CartProvider>
        <Probe />
      </CartProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(cartAPI.get).toHaveBeenCalledTimes(1);

    useAuth.mockReturnValue({ user: { id: 7, role: 'customer' } });
    rerender(
      <CartProvider>
        <Probe />
      </CartProvider>
    );

    await waitFor(() => expect(cartAPI.get).toHaveBeenCalledTimes(2));
  });

  it('does not read the cart again when nothing changed', async () => {
    const { rerender } = render(
      <CartProvider>
        <Probe />
      </CartProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    rerender(
      <CartProvider>
        <Probe />
      </CartProvider>
    );

    await act(async () => {});

    expect(cartAPI.get).toHaveBeenCalledTimes(1);
  });
});

describe('useCart outside the provider', () => {
  it('refuses to work', () => {
    const Consumer = () => {
      useCart();
      return null;
    };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(/useCart must be used within CartProvider/);

    spy.mockRestore();
  });
});
