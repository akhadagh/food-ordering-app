import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { authAPI } from '../services/api';

jest.mock('../services/api', () => ({
  authAPI: {
    getProfile: jest.fn(),
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  },
  apiErrorMessage: jest.fn(() => 'Something went wrong.'),
}));

const CUSTOMER = { id: 7, name: 'Test Customer', email: 'customer@example.test', role: 'customer' };
const ADMIN = { id: 1, name: 'Test Administrator', email: 'admin@example.test', role: 'admin' };

/** A component that shows what the context holds. */
const Probe = () => {
  const { user, loading, isAdmin, login, signup, logout, updateProfile } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'signed out'}</span>
      <span data-testid="role">{user?.role || 'none'}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <button type="button" onClick={() => login('a@example.test', 'secret')}>
        login
      </button>
      <button type="button" onClick={() => signup({ email: 'b@example.test' })}>
        signup
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
      <button type="button" onClick={() => updateProfile({ name: 'Renamed' })}>
        rename
      </button>
    </div>
  );
};

const renderProvider = (ui = <Probe />) =>
  render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the profile from the API on load', async () => {
    authAPI.getProfile.mockResolvedValue({ data: CUSTOMER });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent(CUSTOMER.email);
    expect(authAPI.getProfile).toHaveBeenCalledTimes(1);
  });

  it('treats a failed profile read as signed out, not as an error', async () => {
    authAPI.getProfile.mockRejectedValue({ response: { status: 401 } });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('signed out');
  });

  it('never restores the profile from local storage', async () => {
    // The original implementation cached the user in localStorage, so a
    // tampered cache could grant access (audit finding P2-13).
    window.localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
    authAPI.getProfile.mockResolvedValue({ data: CUSTOMER });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('role')).toHaveTextContent('customer');
    window.localStorage.removeItem('user');
  });

  it('holds the signed-in customer after a login', async () => {
    authAPI.getProfile.mockRejectedValue({ response: { status: 401 } });
    authAPI.login.mockResolvedValue({ data: { user: CUSTOMER } });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await userEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(CUSTOMER.email));
    expect(authAPI.login).toHaveBeenCalledWith({ email: 'a@example.test', password: 'secret' });
  });

  it('knows an administrator from an administrator', async () => {
    authAPI.getProfile.mockResolvedValue({ data: ADMIN });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('admin')).toHaveTextContent('true'));
  });

  it('does not treat a customer as an administrator', async () => {
    authAPI.getProfile.mockResolvedValue({ data: CUSTOMER });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('admin')).toHaveTextContent('false'));
  });

  it('holds the customer after a signup', async () => {
    authAPI.getProfile.mockRejectedValue({ response: { status: 401 } });
    authAPI.signup.mockResolvedValue({ data: { user: CUSTOMER } });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    await userEvent.click(screen.getByRole('button', { name: 'signup' }));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(CUSTOMER.email));
  });

  it('signs the customer out', async () => {
    authAPI.getProfile.mockResolvedValue({ data: CUSTOMER });
    authAPI.logout.mockResolvedValue({ data: { message: 'Signed out' } });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(CUSTOMER.email));
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('signed out'));
    expect(authAPI.logout).toHaveBeenCalled();
  });

  it('signs the customer out even when the logout call fails', async () => {
    authAPI.getProfile.mockResolvedValue({ data: CUSTOMER });
    authAPI.logout.mockRejectedValue(new Error('network down'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(CUSTOMER.email));
    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('signed out'));
    console.warn.mockRestore();
  });

  it('signs the customer out when the session expires', async () => {
    authAPI.getProfile.mockResolvedValue({ data: CUSTOMER });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(CUSTOMER.email));

    act(() => {
      window.dispatchEvent(new CustomEvent('afia:session-expired'));
    });

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('signed out'));
  });

  it('holds the updated profile', async () => {
    authAPI.getProfile.mockResolvedValue({ data: CUSTOMER });
    authAPI.updateProfile.mockResolvedValue({ data: { ...CUSTOMER, name: 'Renamed' } });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent(CUSTOMER.email));
    await userEvent.click(screen.getByRole('button', { name: 'rename' }));

    await waitFor(() => expect(authAPI.updateProfile).toHaveBeenCalledWith({ name: 'Renamed' }));
  });
});

describe('useAuth outside the provider', () => {
  it('refuses to work', () => {
    const Consumer = () => {
      useAuth();
      return null;
    };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow(/useAuth must be used within AuthProvider/);

    spy.mockRestore();
  });
});
