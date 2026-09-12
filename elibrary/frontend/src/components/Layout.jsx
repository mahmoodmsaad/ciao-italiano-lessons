import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import DemoBanner from './DemoBanner.jsx';

const studentLinks = [
  { to: '/', label: 'Catalog', end: true },
  { to: '/my-books', label: 'My Books' },
  { to: '/profile', label: 'Profile' },
];

const adminLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/books', label: 'Books' },
  { to: '/admin/issues', label: 'Issue / Return' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/reports', label: 'Reports' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // After logout go straight to login, clearing the remembered "came from" route.
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true, state: null });
  };

  const links = isAdmin ? adminLinks : studentLinks;

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to={isAdmin ? '/admin' : '/'} className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="hidden text-lg font-bold text-slate-900 sm:block">
              University E-Library
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500">
                {user?.role}
                {user?.rollNo ? ` · ${user.rollNo}` : ''}
              </p>
            </div>
            <button type="button" onClick={handleLogout} className="btn-secondary btn-sm">
              Logout
            </button>
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="btn-secondary btn-sm md:hidden"
            >
              ☰
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={linkClass}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <p className="text-center text-xs text-slate-500">
          University E-Library Management System · Final Year Project
        </p>
      </footer>
    </div>
  );
}
