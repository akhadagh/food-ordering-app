import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage, apiErrorDetails } from '../services/api';
import { BrandLogo, BrandButton, PageMeta } from '../components/brand';
import { UserPlus, AlertCircle, Check } from 'lucide-react';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'Contains a letter', test: (v) => /[a-zA-Z]/.test(v) },
  { label: 'Contains a number', test: (v) => /[0-9]/.test(v) },
];

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(form.password),
  }));
  const passwordValid = passwordChecks.every((c) => c.passed);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!passwordValid) {
      setFieldErrors({ password: 'Your password does not meet all the requirements.' });
      return;
    }
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not create your account. Please try again.'));
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
      <PageMeta title="Create an account" description="Create an Afia Food Hub account to order." path="/signup" />

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-block" aria-label="Afia Food Hub — home">
            <BrandLogo variant="horizontal" height={34} />
          </Link>

          <h1 className="mt-9 font-display text-display-md text-bamboo-900">Create your account</h1>
          <p className="mt-1.5 text-bamboo-600">
            Save your details and track every order from the kitchen to your door.
          </p>

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
              <label htmlFor="name" className="label">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                placeholder="Kwame Mensah"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="label">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                placeholder="+233 24 123 4567"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone ? (
                <p className="field-error">{fieldErrors.phone}</p>
              ) : (
                <p className="field-hint">We use this to tell you when your food is on the way.</p>
              )}
            </div>

            <div>
              <label htmlFor="address" className="label">
                Delivery address
              </label>
              <input
                id="address"
                type="text"
                autoComplete="street-address"
                maxLength={400}
                placeholder="12 Oxford Street, Osu, Accra"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby="password-rules"
              />
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
              <ul id="password-rules" className="mt-2.5 space-y-1">
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-2 text-xs ${
                      rule.passed ? 'text-garden-700' : 'text-bamboo-500'
                    }`}
                  >
                    <Check
                      size={13}
                      className={rule.passed ? 'text-garden-600' : 'text-bamboo-300'}
                      aria-hidden="true"
                    />
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>

            <BrandButton type="submit" loading={loading} className="w-full py-3">
              {!loading && <UserPlus size={16} aria-hidden="true" />}
              {loading ? 'Creating your account…' : 'Create account'}
            </BrandButton>
          </form>

          <p className="mt-7 text-center text-sm text-bamboo-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <img
          src="/brand/banners/about-kitchen-1200x800.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-brand-dark/55" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="max-w-md font-display text-2xl leading-snug text-white text-balance">
            Made fresh in our kitchen the moment you order it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
