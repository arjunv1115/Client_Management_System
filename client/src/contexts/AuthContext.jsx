import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, tokenStore, unwrap } from '../lib/api';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));
  const [usage, setUsage] = useState(null);
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();

  const hydrate = useCallback((payload, sessionMode) => {
    let currentUser = payload.user;
    if (currentUser) {
      const mode = sessionMode || localStorage.getItem('cms_login_mode') || 'user';
      if (mode === 'user' && currentUser.role !== 'client') {
        currentUser = {
          ...currentUser,
          role: 'user',
          role_label: 'User',
          designation: 'User',
        };
      } else if (mode === 'admin') {
        currentUser = {
          ...currentUser,
          role: currentUser.role === 'super_admin' ? 'super_admin' : 'admin',
          role_label: currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin',
          designation: currentUser.designation && currentUser.designation !== 'User' ? currentUser.designation : 'Administrator',
        };
      }
    }
    setUser(currentUser);
    setUsage(payload.usage || null);
    if (currentUser?.preferences?.theme) setTheme(currentUser.preferences.theme);
  }, [setTheme]);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const response = await api.get('/auth/me');
      hydrate(unwrap(response));
      return unwrap(response)?.user || null;
    } catch {
      setUser(null);
      tokenStore.clear();
      localStorage.removeItem('cms_login_mode');
      return null;
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = (event) => {
      setUser(null);
      tokenStore.clear();
      localStorage.removeItem('cms_login_mode');
      queryClient.clear();
      toast.error(event.detail?.message || 'Your session expired. Please sign in again.');
    };
    window.addEventListener('cms:unauthorized', handler);
    return () => window.removeEventListener('cms:unauthorized', handler);
  }, [queryClient]);

  const login = useCallback(async ({ email, password, admin = false }) => {
    const mode = admin ? 'admin' : 'user';
    localStorage.setItem('cms_login_mode', mode);
    const response = await api.post(admin ? '/auth/admin/login' : '/auth/login', { email, password, role: mode });
    const payload = unwrap(response);
    tokenStore.set(payload.token);
    hydrate(payload, mode);
    queryClient.clear();
    return payload.user;
  }, [hydrate, queryClient]);

  const register = useCallback(async (values) => {
    const response = await api.post('/auth/register', values);
    const payload = unwrap(response);
    tokenStore.set(payload.token);
    hydrate(payload, 'admin');
    queryClient.clear();
    return payload.user;
  }, [hydrate, queryClient]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* session may already be gone */ }
    tokenStore.clear();
    localStorage.removeItem('cms_login_mode');
    setUser(null);
    setUsage(null);
    queryClient.clear();
  }, [queryClient]);

  const can = useCallback((permission) => {
    if (!permission) return true;
    if (user?.role === 'super_admin') return true;
    return Boolean(user?.permissions?.includes(permission));
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    usage,
    login,
    register,
    logout,
    refresh,
    can,
    isClient: user?.role === 'client',
    isAdmin: ['super_admin', 'admin'].includes(user?.role),
    isManager: ['super_admin', 'admin', 'manager'].includes(user?.role),
  }), [user, loading, usage, login, register, logout, refresh, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
