import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutPage from './CheckoutPage';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI, menuAPI, apiErrorMessage } from '../services/api';

jest.mock('../context/CartContext', () => ({
  useCart: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => ({
  orderAPI: {
    create: jest.fn(),
    validatePromo: jest.fn(),
  },
  menuAPI: {
    getPaymentMethods: jest.fn(),
  },
  apiErrorMessage: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const Where = () => {
  const location = useLocation();
  return <span data-testid="where">{location.pathname}</span>;
};

const ITEMS = [
  {
    id: 11,
    menuItemId: 1,
    name: 'Jollof Rice',
    quantity: 2,
    customOptions: [{ option: 'Protein', value: 'Chicken' }],
    specialInstructions: '',
  },
];

const QUOTE = {
  subtotal: '80.00',
  delivery_fee: '5.00',
  discount: '0.00',
  total: '85.00',
  items: [{ menu_item_id: 1, line_total: '80.00' }],
};

const USER = { id: 7, name: 'Test Customer', phone: '0241234567', address: '12 Oxford Street, Osu' };

const cartState = (overrides = {}) => ({
  cart: { id: 'cart-1', items: ITEMS, quote: QUOTE },
  items: ITEMS,
  quote: QUOTE,
  loading: false,
  error: null,
  reload: jest.fn(),
  clear: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderPage = (cartOverrides = {}) => {
  const state = cartState(cartOverrides);
  useCart.mockReturnValue(state);
  useAuth.mockReturnValue({ user: USER });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const utils = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:id" element={<Where />} />
          <Route path="/menu" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { ...state, ...utils };
};

/** Waits for the payment-method query to settle. */
const settle = async () => {
  await waitFor(() => expect(screen.queryByText(/preparing checkout/i)).not.toBeInTheDocument());
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiErrorMessage.mockImplementation((err, fallback) => fallback);
    menuAPI.getPaymentMethods.mockResolvedValue({
      data: { methods: [{ id: 'cash', label: 'Cash on delivery', online: false }], onlineEnabled: false },
    });
    orderAPI.create.mockResolvedValue({ data: { id: 34, total: '85.00' } });
  });

  it('waits for the cart before it offers a checkout', () => {
    renderPage({ loading: true });

    expect(screen.getByText(/preparing checkout/i)).toBeInTheDocument();
  });

  it('says the cart is empty when it is', async () => {
    renderPage({ items: [], quote: null });
    await settle();

    expect(screen.getByRole('heading', { name: /your cart is empty/i })).toBeInTheDocument();
  });

  it('says the cart could not be loaded when it could not', async () => {
    // A cart that failed to load is not an empty cart. Telling the customer
    // they have nothing in it hides a fault that retrying would fix.
    renderPage({ items: [], error: 'We could not reach Afia Food Hub.' });
    await settle();

    expect(screen.getByRole('heading', { name: /we could not load your cart/i })).toBeInTheDocument();
    expect(screen.getByText('We could not reach Afia Food Hub.')).toBeInTheDocument();
    expect(screen.queryByText(/your cart is empty/i)).not.toBeInTheDocument();
  });

  it('offers the retry when the cart could not be loaded', async () => {
    const state = renderPage({ items: [], error: 'We could not reach Afia Food Hub.' });
    await settle();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(state.reload).toHaveBeenCalled());
  });

  it('shows the total the server calculated', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /place order/i })).toHaveTextContent('85.00')
    );
  });

  it('offers only the payment methods the API says are available', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Cash on delivery')).toBeInTheDocument());
    expect(screen.queryByText('MTN Mobile Money')).not.toBeInTheDocument();
  });

  it('says so when online payments are not switched on', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/not switched on at the moment/i)).toBeInTheDocument()
    );
  });

  it('refuses to place an order without a delivery address', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.clear(screen.getByLabelText(/delivery address/i));
    await userEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(orderAPI.create).not.toHaveBeenCalled());
  });

  it('refuses to place an order without a phone number', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.clear(screen.getByLabelText(/phone number/i));
    await userEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(orderAPI.create).not.toHaveBeenCalled());
  });

  it('places the order with what the customer chose', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.type(screen.getByLabelText(/delivery notes/i), 'Near the traffic light');
    await userEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(orderAPI.create).toHaveBeenCalled());

    const [payload, idempotencyKey] = orderAPI.create.mock.calls[0];
    expect(payload.items).toEqual([
      {
        menuItemId: 1,
        quantity: 2,
        customOptions: [{ option: 'Protein', value: 'Chicken' }],
        specialInstructions: '',
      },
    ]);
    expect(payload.deliveryAddress).toBe('12 Oxford Street, Osu');
    expect(payload.deliveryNotes).toBe('Near the traffic light');
    expect(payload.customerPhone).toBe('0241234567');
    expect(payload.paymentMethod).toBe('cash');
    expect(payload.fulfilmentType).toBe('delivery');
    expect(idempotencyKey).toEqual(expect.any(String));
  });

  it('empties the cart once the order is placed', async () => {
    const state = renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(state.clear).toHaveBeenCalled());
  });

  it('shows the amount the server recorded on the order', async () => {
    // The cart is emptied straight after the order is placed, so the cart
    // total is zero by then. The customer must be told what the server
    // recorded, not what the empty cart says.
    orderAPI.create.mockResolvedValue({ data: { id: 34, total: '85.00' } });

    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /order placed/i })).toBeInTheDocument());
    expect(screen.getByText(/85\.00/)).toBeInTheDocument();
    expect(screen.getByText(/#34/)).toBeInTheDocument();
  });

  it('offers to track the order it just placed', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /order placed/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /track this order/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/orders/34'));
  });

  it('says so when the order could not be placed', async () => {
    orderAPI.create.mockRejectedValue({ response: { data: { message: 'The kitchen is closed.' } } });
    apiErrorMessage.mockReturnValue('The kitchen is closed.');

    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /place order/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The kitchen is closed.'));
    expect(screen.queryByRole('heading', { name: /order placed/i })).not.toBeInTheDocument();
  });

  it('does not offer the address field when the customer is collecting', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /i will collect/i }));

    await waitFor(() => expect(screen.queryByLabelText(/delivery address/i)).not.toBeInTheDocument());
  });
});
