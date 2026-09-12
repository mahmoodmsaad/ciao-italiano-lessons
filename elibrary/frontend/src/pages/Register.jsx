import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';
import { Alert, Spinner } from '../components/ui.jsx';
import { AuthShell } from './Login.jsx';

const EMPTY = { name: '', email: '', rollNo: '', department: '', phone: '', password: '', confirm: '' };

export default function Register() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="New student account" subtitle="Register for library membership.">
      <form onSubmit={submit} className="space-y-4">
        <Alert onClose={() => setError('')}>{error}</Alert>

        <div>
          <label className="label" htmlFor="name">Full name *</label>
          <input id="name" className="input" value={form.name} onChange={set('name')} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="rollNo">Roll number *</label>
            <input
              id="rollNo"
              className="input"
              value={form.rollNo}
              onChange={set('rollNo')}
              placeholder="BSCS-F21-001"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="department">Department</label>
            <input
              id="department"
              className="input"
              value={form.department}
              onChange={set('department')}
              placeholder="Computer Science"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={set('email')}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" className="input" value={form.phone} onChange={set('phone')} placeholder="0300-1234567" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Password *</label>
            <input
              id="password"
              type="password"
              minLength={6}
              className="input"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="confirm">Confirm password *</label>
            <input
              id="confirm"
              type="password"
              minLength={6}
              className="input"
              value={form.confirm}
              onChange={set('confirm')}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-white" />}
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
