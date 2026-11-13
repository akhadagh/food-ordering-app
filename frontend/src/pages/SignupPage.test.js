import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import SignupPage from './SignupPage';
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

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const fillIn = async (values = {}) => {
  const form = {
    name: 'Test Customer',
    email: 'customer@example.test',
    phone: '0241234567',
    address: '12 Oxford Street, Osu',
    password: 'Password123',
    ...values,
  };

  await userEvent.type(screen.getByLabelText('Full name'), form.name);
  await userEvent.type(screen.getByLabelText('Email'), form.email);
  if (form.phone) await userEvent.type(screen.getByLabelText('Phone number'), form.phone);
  if (form.address) await userEvent.type(screen.getByLabelText('Delivery address'), form.address);
  await userEvent.type(screen.getByLabelText('Password'), form.password);

  return form;
};

describe('SignupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ signup: jest.fn().mockResolvedValue({ id: 7 }) });
    apiErrorMessage.mockImplementation((err, fallback) => fallback);
    apiErrorDetails.mockReturnValue(null);
  });

  it('shows what a password has to be', () => {
    renderPage();

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Contains a letter')).toBeInTheDocument();
    expect(screen.getByText('Contains a number')).toBeInTheDocument();
  });

  it('creates the account and goes to the home page', async () => {
    const signup = jest.fn().mockResolvedValue({ id: 7 });
    useAuth.mockReturnValue({ signup });
    renderPage();

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'));
    expect(signup).toHaveBeenCalledWith({
      name: 'Test Customer',
      email: 'customer@example.test',
      phone: '0241234567',
      address: '12 Oxford Street, Osu',
      password: 'Password123',
    });
  });

  it('never asks for a role', async () => {
    // Audit finding P0-02: the signup form used to offer a role, and the API
    // accepted it, which is how an anonymous visitor became an administrator.
    const signup = jest.fn().mockResolvedValue({ id: 7 });
    useAuth.mockReturnValue({ signup });
    renderPage();

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(signup).toHaveBeenCalled());
    const payload = signup.mock.calls[0][0];
    expect(payload).not.toHaveProperty('role');
    expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument();
  });

  it('refuses a password that does not meet the rules', async () => {
    const signup = jest.fn();
    useAuth.mockReturnValue({ signup });
    renderPage();

    await fillIn({ password: 'short' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/does not meet all the requirements/i)).toBeInTheDocument()
    );
    expect(signup).not.toHaveBeenCalled();
  });

  it('refuses a password with no number', async () => {
    const signup = jest.fn();
    useAuth.mockReturnValue({ signup });
    renderPage();

    await fillIn({ password: 'onlyletters' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(signup).not.toHaveBeenCalled());
  });

  it('shows the reason the API gave when the account cannot be created', async () => {
    useAuth.mockReturnValue({ signup: jest.fn().mockRejectedValue(new Error('taken')) });
    apiErrorMessage.mockReturnValue('That email is already registered.');
    renderPage();

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('That email is already registered.')
    );
  });

  it('shows the error on the field the API named', async () => {
    useAuth.mockReturnValue({ signup: jest.fn().mockRejectedValue(new Error('taken')) });
    apiErrorMessage.mockReturnValue('Check the form.');
    apiErrorDetails.mockReturnValue([{ field: 'email', message: 'That email is already registered.' }]);
    renderPage();

    await fillIn();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText('That email is already registered.')).toBeInTheDocument()
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('leaves the optional fields out when they are empty', async () => {
    const signup = jest.fn().mockResolvedValue({ id: 7 });
    useAuth.mockReturnValue({ signup });
    renderPage();

    await fillIn({ phone: '', address: '' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(signup).toHaveBeenCalled());
    const payload = signup.mock.calls[0][0];
    expect(payload.phone).toBeUndefined();
    expect(payload.address).toBeUndefined();
  });
});
