import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';
import { Alert, Spinner } from '../components/ui.jsx';
import DemoBanner from '../components/DemoBanner.jsx';

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const loggedIn = await login(form.email, form.password);
      const home = loggedIn.role === 'admin' ? '/admin' : '/';

      // Return the user to the page they were trying to reach - but the bare root
      // is where everyone lands by default, not a deep link, so an admin arriving
      // there should still start on the admin dashboard.
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/' ? from : home, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your library account.">
      <form onSubmit={submit} className="space-y-4">
        <Alert onClose={() => setError('')}>{error}</Alert>

        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            value={form.email}
            onChange={set('email')}
            placeholder="you@university.edu.pk"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={form.password}
            onChange={set('password')}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-white" />}
          Login
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Register
        </Link>
      </p>

      <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        <p className="mb-1 font-semibold text-slate-700">Demo accounts</p>
        <p>Admin: admin@university.edu.pk / admin123</p>
        <p>Student: ariba@university.edu.pk / student123</p>
      </div>
    </AuthShell>
  );
}

/** Shared layout for the login and register pages. */
export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-50 via-slate-100 to-slate-200">
      <DemoBanner />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="text-5xl">📚</span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">University E-Library</h1>
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="mb-6 text-lg font-semibold text-slate-900">{title}</h2>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
