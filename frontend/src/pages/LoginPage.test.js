import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LoginPage from './LoginPage';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage, apiErrorDetails } from '../services/api';

jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => ({
  apiErrorMessage: jest.fn(),
  apiErrorDetails: jest.fn(),
}));

const Where = () => {
  const location = useLocation();
  return <span data-testid="where">{location.pathname}</span>;
};

const renderPage = (initialEntries = ['/login']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Where />} />
        <Route path="/admin" element={<Where />} />
        <Route path="/orders" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const CUSTOMER = { id: 7, email: 'customer@example.test', role: 'customer' };
const ADMIN = { id: 1, email: 'admin@example.test', role: 'admin' };

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ login: jest.fn().mockResolvedValue(CUSTOMER) });
    apiErrorMessage.mockImplementation((err, fallback) => fallback);
    apiErrorDetails.mockReturnValue(null);
  });

  it('offers a sign-in form', () => {
    renderPage();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('publishes no credential of any kind', () => {
    // Audit finding P0-07: the login page used to carry the live
    // administrator's address and password.
    renderPage();

    const text = document.body.textContent.toLowerCase();
    expect(text).not.toContain('password123');
    expect(text).not.toContain('admin@');
    expect(text).not.toContain('demo');
  });

  it('signs the customer in and goes to the home page', async () => {
    const login = jest.fn().mockResolvedValue(CUSTOMER);
    useAuth.mockReturnValue({ login });
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'customer@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'));
    expect(login).toHaveBeenCalledWith('customer@example.test', 'Password123');
  });

  it('trims the address before it is sent', async () => {
    const login = jest.fn().mockResolvedValue(CUSTOMER);
    useAuth.mockReturnValue({ login });
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), '  customer@example.test  ');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('customer@example.test', 'Password123'));
  });

  it('sends an administrator to the administration page', async () => {
    useAuth.mockReturnValue({ login: jest.fn().mockResolvedValue(ADMIN) });
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'admin@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin'));
  });

  it('returns the customer to the page they were trying to reach', async () => {
    useAuth.mockReturnValue({ login: jest.fn().mockResolvedValue(CUSTOMER) });
    renderPage([{ pathname: '/login', state: { from: '/orders' } }]);

    await userEvent.type(screen.getByLabelText('Email'), 'customer@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/orders'));
  });

  it('keeps the customer on the page when the sign-in fails', async () => {
    useAuth.mockReturnValue({ login: jest.fn().mockRejectedValue(new Error('no')) });
    apiErrorMessage.mockReturnValue('That email or password is wrong.');
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'customer@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('That email or password is wrong.'));
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('shows the error on the field the API named', async () => {
    useAuth.mockReturnValue({ login: jest.fn().mockRejectedValue(new Error('no')) });
    apiErrorMessage.mockReturnValue('Check the form.');
    apiErrorDetails.mockReturnValue([{ field: 'email', message: 'That email is not registered.' }]);
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'customer@example.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText('That email is not registered.')).toBeInTheDocument()
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the password when it is asked for and hides it again', async () => {
    renderPage();

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(password).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('sends the customer to the sign-up page', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/signup');
  });
});
