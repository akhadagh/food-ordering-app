import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage, apiErrorDetails } from '../services/api';
import { BrandLogo, BrandButton, PageMeta } from '../components/brand';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from || null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(user.role === 'admin' ? '/admin' : from || '/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not sign you in. Please try again.'));
      const details = apiErrorDetails(err);
      if (details) {
        const map = {};
        for (const d of details) if (d.field) map[d.field] = d.message;
        setFieldErrors(map);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <PageMeta title="Sign in" description="Sign in to order from Afia Food Hub." path="/login" />

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-block" aria-label="Afia Food Hub — home">
            <BrandLogo variant="horizontal" height={34} />
          </Link>

          <h1 className="mt-9 font-display text-display-md text-bamboo-900">Welcome back</h1>
          <p className="mt-1.5 text-bamboo-600">Sign in to order from our kitchen.</p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-control border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bamboo-400"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-10"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="field-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bamboo-400"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-10 pr-11"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-bamboo-400 transition-colors hover:text-bamboo-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="field-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <BrandButton type="submit" loading={loading} className="w-full py-3">
              {!loading && <LogIn size={16} aria-hidden="true" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </BrandButton>
          </form>

          <p className="mt-7 text-center text-sm text-bamboo-600">
            New to Afia Food Hub?{' '}
            <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <img
          src="/brand/banners/hero-home-1200x1200.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-brand-dark/55" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="max-w-md font-display text-2xl leading-snug text-white text-balance">
            “Real Ghanaian food, cooked to order and delivered hot.”
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
