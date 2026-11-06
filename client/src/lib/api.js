import axios from 'axios';

const TOKEN_KEY = 'cms_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error.message || 'Something went wrong.';
    error.message = message;
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/admin/login')) {
        window.dispatchEvent(new CustomEvent('cms:unauthorized', { detail: { message } }));
      }
    }
    return Promise.reject(error);
  },
);

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const unwrap = (response) => response.data?.data;

export async function fetchAll(endpoint, params = {}) {
  const response = await api.get(endpoint, { params: { limit: 500, ...params } });
  return response.data?.data || [];
}

export async function downloadExport(endpoint, { format = 'csv', params = {}, filename } = {}) {
  const response = await api.get(`${endpoint}/export`, {
    params: { ...params, format, all: 'true' },
    responseType: 'blob',
  });
  const blob = new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${endpoint.replace(/\//g, '-')}-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function absoluteUrl(path) {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  if (path.startsWith('/uploads')) {
    const base = api.defaults.baseURL || '/api';
    if (base.startsWith('http')) return `${new URL(base).origin}${path}`;
    return path;
  }
  return path;
}
