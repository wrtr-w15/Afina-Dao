import { lightTheme, darkTheme, type Theme } from './index';

// Utility functions for working with themes
export const themeUtils = {
  // Get color value from theme
  getColor: (theme: Theme, colorPath: string): string => {
    const keys = colorPath.split('.');
    let value: any = theme;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return '';
      }
    }
    
    return typeof value === 'string' ? value : '';
  },
  
  // Get CSS custom property name
  getCSSVar: (path: string): string => {
    return `--${path.replace(/\./g, '-')}`;
  },
  
  // Generate CSS custom properties for a theme
  generateCSSVars: (theme: Theme): Record<string, string> => {
    const vars: Record<string, string> = {};
    
    // Colors
    Object.entries(theme.colors).forEach(([colorName, shades]) => {
      Object.entries(shades).forEach(([shade, value]) => {
        vars[`--color-${colorName}-${shade}`] = value;
      });
    });
    
    // Background
    Object.entries(theme.background).forEach(([key, value]) => {
      vars[`--bg-${key}`] = value;
    });
    
    // Text
    Object.entries(theme.text).forEach(([key, value]) => {
      vars[`--text-${key}`] = value;
    });
    
    // Border
    Object.entries(theme.border).forEach(([key, value]) => {
      vars[`--border-${key}`] = value;
    });
    
    // Shadow
    Object.entries(theme.shadow).forEach(([key, value]) => {
      vars[`--shadow-${key}`] = value;
    });
    
    // Components
    Object.entries(theme.components).forEach(([componentName, componentStyles]) => {
      Object.entries(componentStyles).forEach(([styleName, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            vars[`--${componentName}-${styleName}-${subKey}`] = subValue;
          });
        } else {
          vars[`--${componentName}-${styleName}`] = value;
        }
      });
    });
    
    // Gradients
    Object.entries(theme.gradients).forEach(([key, value]) => {
      vars[`--gradient-${key}`] = value;
    });
    
    // Glass
    Object.entries(theme.glass).forEach(([key, value]) => {
      vars[`--glass-${key}`] = value;
    });
    
    return vars;
  },
  
  // Apply theme to element
  applyTheme: (element: HTMLElement, theme: Theme): void => {
    const vars = themeUtils.generateCSSVars(theme);
    
    Object.entries(vars).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  },
  
  // Get contrast color (black or white) for a given background color
  getContrastColor: (backgroundColor: string): string => {
    // Remove # if present
    const hex = backgroundColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  },
  
  // Check if color is light or dark
  isLightColor: (color: string): boolean => {
    const contrast = themeUtils.getContrastColor(color);
    return contrast === '#000000';
  },
  
  // Generate color palette from base color
  generateColorPalette: (baseColor: string): Record<string, string> => {
    // This is a simplified version - in a real implementation,
    // you'd want to use a proper color manipulation library
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return {
      50: `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`,
      100: `rgb(${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)})`,
      200: `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`,
      300: `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`,
      400: `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`,
      500: baseColor,
      600: `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`,
      700: `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`,
      800: `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`,
      900: `rgb(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)})`,
    };
  },
  
  // Get theme-aware color
  getThemeAwareColor: (lightColor: string, darkColor: string, isDark: boolean): string => {
    return isDark ? darkColor : lightColor;
  },
  
  // Create CSS class for theme
  createThemeClass: (theme: Theme, className: string): string => {
    const vars = themeUtils.generateCSSVars(theme);
    const cssVars = Object.entries(vars)
      .map(([property, value]) => `${property}: ${value};`)
      .join('\n');
    
    return `.${className} {\n  ${cssVars}\n}`;
  },
};

// Predefined theme combinations
export const themeCombinations = {
  // High contrast themes
  highContrastLight: {
    ...lightTheme,
    text: {
      ...lightTheme.text,
      primary: '#000000',
      secondary: '#333333',
    },
    background: {
      ...lightTheme.background,
      primary: '#ffffff',
      secondary: '#f0f0f0',
    },
  },
  
  highContrastDark: {
    ...darkTheme,
    text: {
      ...darkTheme.text,
      primary: '#ffffff',
      secondary: '#e0e0e0',
    },
    background: {
      ...darkTheme.background,
      primary: '#000000',
      secondary: '#1a1a1a',
    },
  },
  
  // Reduced motion themes
  reducedMotion: {
    transitions: {
      fast: '0ms',
      normal: '0ms',
      slow: '0ms',
    },
  },
};

// Theme validation
export const validateTheme = (theme: any): boolean => {
  const requiredKeys = ['colors', 'background', 'text', 'border', 'shadow', 'components'];
  
  return requiredKeys.every(key => 
    theme && 
    typeof theme === 'object' && 
    key in theme
  );
};

// Theme merging utility
export const mergeThemes = (baseTheme: Theme, overrides: Partial<Theme>): Theme => {
  return {
    ...baseTheme,
    ...overrides,
    colors: {
      ...baseTheme.colors,
      ...overrides.colors,
    },
    background: {
      ...baseTheme.background,
      ...overrides.background,
    },
    text: {
      ...baseTheme.text,
      ...overrides.text,
    },
    border: {
      ...baseTheme.border,
      ...overrides.border,
    },
    shadow: {
      ...baseTheme.shadow,
      ...overrides.shadow,
    },
    components: {
      ...baseTheme.components,
      ...overrides.components,
    },
    gradients: {
      ...baseTheme.gradients,
      ...overrides.gradients,
    },
    glass: {
      ...baseTheme.glass,
      ...overrides.glass,
    },
  };
};
