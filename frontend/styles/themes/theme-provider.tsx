import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getTheme,
  loadTheme,
  saveTheme,
  onSystemThemeChange,
  detectSystemTheme,
  THEME_NAMES,
  type Theme,
  type ThemeName,
} from './index';

interface ThemeContextType {
  currentTheme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeName;
  storageKey?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = THEME_NAMES.LIGHT,
  storageKey = 'afina-dao-theme',
  enableSystem = true,
}: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Load theme from storage on mount
  useEffect(() => {
    const savedTheme = loadTheme();
    if (savedTheme) {
      setThemeName(savedTheme);
    } else if (enableSystem) {
      setThemeName(THEME_NAMES.SYSTEM);
    }
    setMounted(true);
  }, [enableSystem]);

  // Listen to system theme changes
  useEffect(() => {
    if (!enableSystem || themeName !== THEME_NAMES.SYSTEM) {
      return;
    }

    const unsubscribe = onSystemThemeChange((systemTheme) => {
      // Only update if we're in system mode
      if (themeName === THEME_NAMES.SYSTEM) {
        setThemeName(systemTheme);
      }
    });

    return unsubscribe;
  }, [themeName, enableSystem]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const theme = getTheme(themeName);
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light-theme', 'dark-theme');
    
    // Add new theme class
    if (themeName === THEME_NAMES.DARK || (themeName === THEME_NAMES.SYSTEM && detectSystemTheme() === THEME_NAMES.DARK)) {
      root.classList.add('dark-theme');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.add('light-theme');
      root.setAttribute('data-theme', 'light');
    }

    // Apply CSS custom properties
    const cssVars = generateThemeCSS(theme);
    const style = document.createElement('style');
    style.textContent = `:root { ${cssVars} }`;
    
    // Remove existing theme styles
    const existingStyle = document.getElementById('theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.id = 'theme-styles';
    document.head.appendChild(style);
  }, [themeName, mounted]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeName(newTheme);
    saveTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = themeName === THEME_NAMES.LIGHT ? THEME_NAMES.DARK : THEME_NAMES.LIGHT;
    setTheme(newTheme);
  };

  const currentTheme = getTheme(themeName);
  const isDark = themeName === THEME_NAMES.DARK || (themeName === THEME_NAMES.SYSTEM && detectSystemTheme() === THEME_NAMES.DARK);
  const isLight = themeName === THEME_NAMES.LIGHT || (themeName === THEME_NAMES.SYSTEM && detectSystemTheme() === THEME_NAMES.LIGHT);
  const isSystem = themeName === THEME_NAMES.SYSTEM;

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeName,
        setTheme,
        toggleTheme,
        isDark,
        isLight,
        isSystem,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper function to generate CSS custom properties
function generateThemeCSS(theme: Theme): string {
  const cssVars: string[] = [];
  
  // Colors
  Object.entries(theme.colors).forEach(([colorName, colorShades]) => {
    Object.entries(colorShades).forEach(([shade, value]) => {
      cssVars.push(`--color-${colorName}-${shade}: ${value};`);
    });
  });
  
  // Background
  Object.entries(theme.background).forEach(([key, value]) => {
    cssVars.push(`--bg-${key}: ${value};`);
  });
  
  // Text
  Object.entries(theme.text).forEach(([key, value]) => {
    cssVars.push(`--text-${key}: ${value};`);
  });
  
  // Border
  Object.entries(theme.border).forEach(([key, value]) => {
    cssVars.push(`--border-${key}: ${value};`);
  });
  
  // Shadow
  Object.entries(theme.shadow).forEach(([key, value]) => {
    cssVars.push(`--shadow-${key}: ${value};`);
  });
  
  // Components
  Object.entries(theme.components).forEach(([componentName, componentStyles]) => {
    Object.entries(componentStyles).forEach(([styleName, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          cssVars.push(`--${componentName}-${styleName}-${subKey}: ${subValue};`);
        });
      } else {
        cssVars.push(`--${componentName}-${styleName}: ${value};`);
      }
    });
  });
  
  // Gradients
  Object.entries(theme.gradients).forEach(([key, value]) => {
    cssVars.push(`--gradient-${key}: ${value};`);
  });
  
  // Glass
  Object.entries(theme.glass).forEach(([key, value]) => {
    cssVars.push(`--glass-${key}: ${value};`);
  });
  
  return cssVars.join('\n');
}
