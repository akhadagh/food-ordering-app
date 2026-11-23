import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './HomePage';
import { menuAPI } from '../services/api';

jest.mock('../services/api', () => ({
  menuAPI: {
    getItems: jest.fn(),
    getCategories: jest.fn(),
    getPaymentMethods: jest.fn(),
  },
}));

jest.mock('../config/brand', () => ({
  BRAND: { shortDescription: 'Ghanaian food cooked to order.' },
  BUSINESS: { deliveryZones: null, hours: null },
}));

jest.mock('../components/menu/FoodImageCarousel', () => ({
  __esModule: true,
  default: ({ alt }) => {
    const React = require('react');
    return React.createElement('img', { alt });
  },
}));

const ITEM = {
  id: 1,
  name: 'Banku with Okra Soup',
  price: '25.00',
  category_name: 'Banku',
};

const renderPage = async (methods) => {
  menuAPI.getItems.mockResolvedValue({ data: [ITEM] });
  menuAPI.getCategories.mockResolvedValue({ data: [] });
  menuAPI.getPaymentMethods.mockResolvedValue({ data: { methods } });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );

  await waitFor(() => expect(menuAPI.getPaymentMethods).toHaveBeenCalled());
  await screen.findByText('Payment that suits you');
  await screen.findByText('Banku with Okra Soup');
};

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only advertises the payment methods the backend actually offers', async () => {
    await renderPage([{ id: 'cash', label: 'Cash on delivery', online: false }]);

    expect(screen.getAllByText(/cash on delivery/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/mobile money|momo|card/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/accra/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/popular dishes/i)).not.toBeInTheDocument();
  });

  it('mentions an online method only when the backend says it is enabled', async () => {
    await renderPage([
      { id: 'mtn_momo', label: 'MTN Mobile Money', online: true },
      { id: 'cash', label: 'Cash on delivery', online: false },
    ]);

    expect(screen.getAllByText(/MTN Mobile Money/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/on delivery or online/i).length).toBeGreaterThan(0);
  });
});
