import { useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, Spinner } from '../../components/ui.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    department: user?.department || '',
    phone: user?.phone || '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    setFeedback({ type: '', text: '' });

    try {
      const { data } = await api.put('/auth/profile', profile);
      setUser(data.user);
      setFeedback({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    if (passwords.newPassword !== passwords.confirm) {
      setFeedback({ type: 'error', text: 'The new passwords do not match.' });
      return;
    }

    setBusy('password');
    try {
      await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      setFeedback({ type: 'success', text: 'Password changed.' });
    } catch (err) {
      setFeedback({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Update your details and password here.</p>
      </header>

      {feedback.text && (
        <Alert type={feedback.type} onClose={() => setFeedback({ type: '', text: '' })}>
          {feedback.text}
        </Alert>
      )}

      <form onSubmit={saveProfile} className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Your details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-name">Name</label>
            <input
              id="p-name"
              className="input"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="p-email">Email (cannot be changed)</label>
            <input id="p-email" className="input bg-slate-50" value={user?.email || ''} disabled />
          </div>

          <div>
            <label className="label" htmlFor="p-roll">Roll number</label>
            <input id="p-roll" className="input bg-slate-50" value={user?.rollNo || '-'} disabled />
          </div>

          <div>
            <label className="label" htmlFor="p-dept">Department</label>
            <input
              id="p-dept"
              className="input"
              value={profile.department}
              onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="p-phone">Phone</label>
            <input
              id="p-phone"
              className="input"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy === 'profile'}>
            {busy === 'profile' && <Spinner className="h-4 w-4 text-white" />}
            Save changes
          </button>
        </div>
      </form>

      <form onSubmit={savePassword} className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Change password</h2>

        <div>
          <label className="label" htmlFor="p-current">Current password</label>
          <input
            id="p-current"
            type="password"
            className="input"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-new">New password</label>
            <input
              id="p-new"
              type="password"
              minLength={6}
              className="input"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="p-confirm">Confirm new password</label>
            <input
              id="p-confirm"
              type="password"
              minLength={6}
              className="input"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={busy === 'password'}>
            {busy === 'password' && <Spinner className="h-4 w-4 text-white" />}
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}
