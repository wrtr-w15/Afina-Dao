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
  const [themeName, setThemeName] = useState<ThemeName>(THEME_NAMES.LIGHT);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('afina-dao-theme') as ThemeName || THEME_NAMES.LIGHT;
    setThemeName(savedTheme);
    setIsDarkMode(savedTheme === THEME_NAMES.DARK);
  }, []);

  // Update theme when themeName changes
  useEffect(() => {
    const isDark = themeName === THEME_NAMES.DARK;
    setIsDarkMode(isDark);
    
    // Apply theme to document
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeName]);

  const toggleTheme = () => {
    const newTheme = themeName === THEME_NAMES.LIGHT ? THEME_NAMES.DARK : THEME_NAMES.LIGHT;
    setTheme(newTheme);
  };

  const setTheme = (theme: ThemeName) => {
    setThemeName(theme);
    localStorage.setItem('afina-dao-theme', theme);
  };

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