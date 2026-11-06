import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, unwrap } from '../lib/api';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'cms_theme';

function systemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? systemTheme() : theme;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.theme = resolved;
  return resolved;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');
  const [resolvedTheme, setResolvedTheme] = useState(() => applyTheme(localStorage.getItem(STORAGE_KEY) || 'system'));

  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setResolvedTheme(applyTheme('system'));
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    if (tokenStore.get()) {
      api.put('/preferences/theme', { theme: next }).catch(() => {});
    }
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, applyTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
