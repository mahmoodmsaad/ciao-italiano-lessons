import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'; // Vite proxy backend tak pohanchata hai

const api = axios.create({ baseURL });

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
    const onLoginPage = ['/login', '/register'].includes(window.location.pathname);
    if (err.response?.status === 401 && !onLoginPage) {
      localStorage.removeItem('elibrary_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/** Server ke error message ko aasan text mein badalta hai. */
export const errorMessage = (err, fallback = 'Kuch ghalat ho gaya. Dobara koshish karein.') =>
  err?.response?.data?.message || (err?.request ? 'Server se rabta nahi ho paya.' : fallback);

export default api;
