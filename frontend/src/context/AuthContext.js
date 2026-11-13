import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, apiErrorMessage } from '../services/api';

const AuthContext = createContext(null);

/**
 * Authentication state.
 *
 * The session token lives in an httpOnly cookie that the API sets, so it
 * cannot be read by JavaScript. The profile is re-read from the API on load
 * rather than restored from localStorage, so a stale or tampered cached
 * user can never grant access (audit findings P2-12, P2-13).
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await authAPI.getProfile();
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshProfile();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  // The API clears the cookie when a session expires.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('afia:session-expired', onExpired);
    return () => window.removeEventListener('afia:session-expired', onExpired);
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const { data } = await authAPI.signup(payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // A failed logout call must never leave the UI thinking you are signed in.
      if (err?.response?.status !== 401) {
        // eslint-disable-next-line no-console
        console.warn('Logout request failed:', apiErrorMessage(err));
      }
    }
    setUser(null);
  };

  const updateProfile = async (payload) => {
    const { data } = await authAPI.updateProfile(payload);
    setUser(data);
    return data;
  };

  const changePassword = async (payload) => {
    const { data } = await authAPI.changePassword(payload);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateProfile,
        changePassword,
        refreshProfile,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
