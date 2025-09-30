export const lightTheme = {
  colors: {
    // Primary colors
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Secondary colors
    secondary: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    
    // Status colors
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Neutral colors
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
    },
  },
  
  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    overlay: 'rgba(0, 0, 0, 0.5)',
    glass: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Text colors
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    disabled: '#d1d5db',
  },
  
  // Border colors
  border: {
    primary: '#e5e7eb',
    secondary: '#d1d5db',
    focus: '#3b82f6',
    error: '#ef4444',
  },
  
  // Shadow colors
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Component specific colors
  components: {
    card: {
      background: '#ffffff',
      border: '#e5e7eb',
      shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    
    input: {
      background: '#ffffff',
      border: '#d1d5db',
      borderFocus: '#3b82f6',
      text: '#111827',
      placeholder: '#9ca3af',
    },
    
    button: {
      primary: {
        background: '#3b82f6',
        backgroundHover: '#2563eb',
        text: '#ffffff',
      },
      secondary: {
        background: '#f3f4f6',
        backgroundHover: '#e5e7eb',
        text: '#111827',
      },
      outline: {
        background: 'transparent',
        border: '#d1d5db',
        backgroundHover: '#f9fafb',
        text: '#111827',
      },
    },
    
    sidebar: {
      background: '#ffffff',
      border: '#e5e7eb',
      text: '#111827',
      hover: '#f9fafb',
    },
    
    header: {
      background: '#ffffff',
      border: '#e5e7eb',
      text: '#111827',
    },
    
    modal: {
      background: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      border: '#e5e7eb',
    },
    
    alert: {
      info: {
        background: '#dbeafe',
        border: '#93c5fd',
        text: '#1e40af',
      },
      success: {
        background: '#d1fae5',
        border: '#86efac',
        text: '#047857',
      },
      warning: {
        background: '#fef3c7',
        border: '#fde68a',
        text: '#d97706',
      },
      error: {
        background: '#fee2e2',
        border: '#fca5a5',
        text: '#dc2626',
      },
    },
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    secondary: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  
  // Glass effect
  glass: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    backdrop: 'blur(10px)',
  },
} as const;

export type LightTheme = typeof lightTheme;
