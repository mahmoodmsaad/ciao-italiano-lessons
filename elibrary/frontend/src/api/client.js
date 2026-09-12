import axios from 'axios';
import { demoAdapter } from './demoBackend.js';

/**
 * Demo mode runs the whole app inside the browser, with no backend server.
 * It is enabled only by `VITE_DEMO=true npm run build`; a normal build drops
 * the demo backend from the bundle entirely.
 */
export const DEMO = import.meta.env.VITE_DEMO === 'true';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'; // the Vite dev proxy forwards this to the backend

const api = axios.create({
  baseURL,
  adapter: DEMO ? demoAdapter : undefined,
});

// Attach the saved token to every request.
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('elibrary_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Send the user back to the login page when the token is rejected.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // The demo build uses hash routing (#/login); the normal build uses paths (/login).
    const path = DEMO ? window.location.hash.slice(1) : window.location.pathname;
    const onLoginPage = ['/login', '/register'].includes(path);

    if (err.response?.status === 401 && !onLoginPage) {
      localStorage.removeItem('elibrary_token');
      if (DEMO) window.location.hash = '#/login';
      else window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/** Turns a server error into a message that can be shown to the user. */
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.request ? 'Could not reach the server.' : fallback);

export default api;
