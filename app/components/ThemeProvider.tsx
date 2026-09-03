'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  appZoom: number;
  setAppZoom: (zoom: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [appZoom, setAppZoomState] = useState<number>(100);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored ?? (prefersDark ? 'dark' : 'light');
    setThemeState(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');

    const storedZoom = localStorage.getItem('appZoom');
    const initialZoom = storedZoom ? parseInt(storedZoom, 10) : 50; // User wants default 50%
    setAppZoomState(initialZoom);
    document.documentElement.style.fontSize = `${(initialZoom / 100) * 16}px`;
    // Clean up old zoom property if exists
    document.documentElement.style.removeProperty('zoom');

    setMounted(true);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const setAppZoom = (zoom: number) => {
    setAppZoomState(zoom);
    localStorage.setItem('appZoom', zoom.toString());
    document.documentElement.style.fontSize = `${(zoom / 100) * 16}px`;
  };

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, appZoom, setAppZoom }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
