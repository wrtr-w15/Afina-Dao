import { lightTheme, type LightTheme } from './light-theme';
import { darkTheme, type DarkTheme } from './dark-theme';

export { lightTheme, darkTheme };
export type { LightTheme, DarkTheme };

// Theme type union
export type Theme = LightTheme | DarkTheme;

// Theme names
export const THEME_NAMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeName = typeof THEME_NAMES[keyof typeof THEME_NAMES];

// Theme configuration
export const themeConfig = {
  [THEME_NAMES.LIGHT]: {
    name: 'Light',
    description: 'Light theme with bright colors',
    theme: lightTheme,
    icon: '☀️',
  },
  [THEME_NAMES.DARK]: {
    name: 'Dark',
    description: 'Dark theme with dark colors',
    theme: darkTheme,
    icon: '🌙',
  },
  [THEME_NAMES.SYSTEM]: {
    name: 'System',
    description: 'Follows system preference',
    theme: null, // Will be determined by system preference
    icon: '💻',
  },
} as const;

// Theme utilities
export const getTheme = (themeName: ThemeName): Theme => {
  if (themeName === THEME_NAMES.SYSTEM) {
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? darkTheme 
        : lightTheme;
    }
    return lightTheme; // Default to light theme
  }
  
  return themeName === THEME_NAMES.DARK ? darkTheme : lightTheme;
};

// CSS custom properties generator
export const generateThemeCSS = (theme: Theme): string => {
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
};

// Theme detection utilities
export const detectSystemTheme = (): ThemeName => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return THEME_NAMES.LIGHT;
  }
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? THEME_NAMES.DARK 
    : THEME_NAMES.LIGHT;
};

// Theme persistence
export const THEME_STORAGE_KEY = 'afina-dao-theme';

export const saveTheme = (themeName: ThemeName): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }
};

export const loadTheme = (): ThemeName => {
  if (typeof window === 'undefined') {
    return THEME_NAMES.LIGHT;
  }
  
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName;
  return saved && Object.values(THEME_NAMES).includes(saved) ? saved : THEME_NAMES.LIGHT;
};

// Theme change listener
export const onSystemThemeChange = (callback: (theme: ThemeName) => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? THEME_NAMES.DARK : THEME_NAMES.LIGHT);
  };
  
  mediaQuery.addEventListener('change', handler);
  
  return () => mediaQuery.removeEventListener('change', handler);
};
