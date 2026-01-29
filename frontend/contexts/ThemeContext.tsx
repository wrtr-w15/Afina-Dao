'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEME_NAMES, type ThemeName } from '../styles/themes';

interface ThemeContextType {
  themeName: ThemeName;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always dark mode
  const [themeName] = useState<ThemeName>(THEME_NAMES.DARK);
  const [isDarkMode] = useState(true);

  // Apply dark theme on mount
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    localStorage.setItem('afina-dao-theme', THEME_NAMES.DARK);
  }, []);

  // These functions are kept for API compatibility but don't do anything
  const toggleTheme = () => {};
  const setTheme = () => {};

  return (
    <ThemeContext.Provider value={{ themeName, isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
