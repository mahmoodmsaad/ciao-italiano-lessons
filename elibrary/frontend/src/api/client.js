import axios from 'axios';
import { demoAdapter } from './demoBackend.js';

/**
 * Demo mode: app browser ke andar hi chalti hai, koi backend server nahi chahiye.
 * Ye sirf `VITE_DEMO=true npm run build` par on hota hai - normal build mein
 * demo backend ka code bundle se nikal jata hai.
 */
export const DEMO = import.meta.env.VITE_DEMO === 'true';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'; // Vite proxy backend tak pohanchata hai

const api = axios.create({
  baseURL,
  adapter: DEMO ? demoAdapter : undefined,
});

// Har request ke saath token bhejte hain.
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('elibrary_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Token expire ho jaye to login page par bhej dete hain.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Demo build hash routing use karti hai (#/login), normal build path routing (/login).
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

/** Server ke error message ko aasan text mein badalta hai. */
export const errorMessage = (err, fallback = 'Kuch ghalat ho gaya. Dobara koshish karein.') =>
  err?.response?.data?.message || (err?.request ? 'Server se rabta nahi ho paya.' : fallback);

export default api;
