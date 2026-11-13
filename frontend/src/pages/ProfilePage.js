import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage, apiErrorDetails } from '../services/api';
import { BrandCard, BrandBadge, BrandButton, PageMeta } from '../components/brand';
import { User, Save, KeyRound, AlertCircle, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateProfile, changePassword } = useAuth();

  const [profile, setProfile] = useState({ name: '', phone: '', address: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setFieldErrors({});
    try {
      await updateProfile({
        name: profile.name.trim(),
        phone: profile.phone.trim() || undefined,
        address: profile.address.trim(),
      });
      toast.success('Your details have been updated.');
    } catch (err) {
      setProfileError(apiErrorMessage(err, 'We could not update your details.'));
      const details = apiErrorDetails(err);
      if (details) {
        const map = {};
        for (const d of details) if (d.field) map[d.field] = d.message;
        setFieldErrors(map);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Your password has been changed.');
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'We could not change your password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="page-container max-w-3xl">
      <PageMeta title="Your profile" path="/profile" />

      <header className="mb-8">
        <h1 className="font-display text-display-md text-bamboo-900">Your profile</h1>
        <p className="mt-1 text-bamboo-600">Keep your contact details up to date so we can reach you.</p>
      </header>

      <BrandCard className="mb-6 p-7">
        <div className="flex items-center gap-4 border-b border-bamboo-100 pb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500">
            <span className="font-display text-xl font-bold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg text-bamboo-900">{user?.name}</h2>
            <p className="truncate text-sm text-bamboo-600">{user?.email}</p>
            <div className="mt-1.5">
              <BrandBadge tone={user?.role === 'admin' ? 'accent' : 'neutral'}>
                {user?.role === 'admin' ? 'Administrator' : 'Customer'}
              </BrandBadge>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfile} className="mt-6 space-y-5" noValidate>
          {profileError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-control border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{profileError}</span>
            </div>
          )}

          <div>
            <label htmlFor="profile-name" className="label">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={120}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="input-field"
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="profile-phone" className="label">
              Phone number
            </label>
            <input
              id="profile-phone"
              type="tel"
              maxLength={30}
              placeholder="+233 24 123 4567"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="input-field"
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
          </div>

          <div>
            <label htmlFor="profile-address" className="label">
              Delivery address
            </label>
            <textarea
              id="profile-address"
              rows={2}
              maxLength={400}
              placeholder="12 Oxford Street, Osu, Accra"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="input-field"
            />
          </div>

          <BrandButton type="submit" loading={savingProfile}>
            {!savingProfile && <Save size={16} aria-hidden="true" />}
            {savingProfile ? 'Saving…' : 'Save changes'}
          </BrandButton>
        </form>
      </BrandCard>

      <BrandCard className="p-7">
        <h2 className="font-display text-lg text-bamboo-900">Change password</h2>
        <p className="mt-1 text-sm text-bamboo-600">
          Choose something you have not used elsewhere. At least 8 characters, with a letter and a
          number.
        </p>

        <form onSubmit={handlePassword} className="mt-6 space-y-5" noValidate>
          {passwordError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-control border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label htmlFor="current-password" className="label">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="label">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="input-field"
            />
          </div>

          <BrandButton type="submit" variant="secondary" loading={savingPassword}>
            {!savingPassword && <KeyRound size={16} aria-hidden="true" />}
            {savingPassword ? 'Updating…' : 'Change password'}
          </BrandButton>
        </form>
      </BrandCard>
    </div>
  );
};

export default ProfilePage;
