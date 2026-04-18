import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('miro_theme') || 'system');

  useEffect(() => {
    localStorage.setItem('miro_theme', theme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setThemeStable = useCallback((t) => setTheme(t), []);

  const value = useMemo(() => ({ theme, setTheme: setThemeStable }), [theme, setThemeStable]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
