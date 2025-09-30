export const darkTheme = {
  colors: {
    // Primary colors
    primary: {
      50: '#1e3a8a',
      100: '#1e40af',
      200: '#1d4ed8',
      300: '#2563eb',
      400: '#3b82f6',
      500: '#60a5fa',
      600: '#93c5fd',
      700: '#bfdbfe',
      800: '#dbeafe',
      900: '#eff6ff',
    },
    
    // Secondary colors
    secondary: {
      50: '#111827',
      100: '#1f2937',
      200: '#374151',
      300: '#4b5563',
      400: '#6b7280',
      500: '#9ca3af',
      600: '#d1d5db',
      700: '#e5e7eb',
      800: '#f3f4f6',
      900: '#f9fafb',
    },
    
    // Status colors
    success: {
      50: '#064e3b',
      100: '#065f46',
      200: '#047857',
      300: '#059669',
      400: '#10b981',
      500: '#34d399',
      600: '#6ee7b7',
      700: '#a7f3d0',
      800: '#d1fae5',
      900: '#ecfdf5',
    },
    
    warning: {
      50: '#78350f',
      100: '#92400e',
      200: '#b45309',
      300: '#d97706',
      400: '#f59e0b',
      500: '#fbbf24',
      600: '#fcd34d',
      700: '#fde68a',
      800: '#fef3c7',
      900: '#fffbeb',
    },
    
    error: {
      50: '#7f1d1d',
      100: '#991b1b',
      200: '#b91c1c',
      300: '#dc2626',
      400: '#ef4444',
      500: '#f87171',
      600: '#fca5a5',
      700: '#fecaca',
      800: '#fee2e2',
      900: '#fef2f2',
    },
    
    info: {
      50: '#1e3a8a',
      100: '#1e40af',
      200: '#1d4ed8',
      300: '#2563eb',
      400: '#3b82f6',
      500: '#60a5fa',
      600: '#93c5fd',
      700: '#bfdbfe',
      800: '#dbeafe',
      900: '#eff6ff',
    },
    
    // Neutral colors
    neutral: {
      50: '#18181b',
      100: '#27272a',
      200: '#3f3f46',
      300: '#52525b',
      400: '#71717a',
      500: '#a1a1aa',
      600: '#d4d4d8',
      700: '#e4e4e7',
      800: '#f4f4f5',
      900: '#fafafa',
    },
  },
  
  // Background colors
  background: {
    primary: '#1D1D1D',
    secondary: '#2D2D2D',
    tertiary: '#3D3D3D',
    overlay: 'rgba(0, 0, 0, 0.7)',
    glass: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Text colors
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    inverse: '#0f172a',
    disabled: '#64748b',
  },
  
  // Border colors
  border: {
    primary: '#334155',
    secondary: '#475569',
    focus: '#60a5fa',
    error: '#f87171',
  },
  
  // Shadow colors
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  },
  
  // Component specific colors
  components: {
    card: {
      background: '#1e293b',
      border: '#334155',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    },
    
    input: {
      background: '#1e293b',
      border: '#475569',
      borderFocus: '#60a5fa',
      text: '#f8fafc',
      placeholder: '#64748b',
    },
    
    button: {
      primary: {
        background: '#60a5fa',
        backgroundHover: '#3b82f6',
        text: '#0f172a',
      },
      secondary: {
        background: '#334155',
        backgroundHover: '#475569',
        text: '#f8fafc',
      },
      outline: {
        background: 'transparent',
        border: '#475569',
        backgroundHover: '#334155',
        text: '#f8fafc',
      },
    },
    
    sidebar: {
      background: '#1D1D1D',
      border: '#2D2D2D',
      text: '#f8fafc',
      hover: '#2D2D2D',
    },
    
    header: {
      background: '#1D1D1D',
      border: '#2D2D2D',
      text: '#f8fafc',
    },
    
    modal: {
      background: '#1e293b',
      overlay: 'rgba(0, 0, 0, 0.7)',
      border: '#334155',
    },
    
    alert: {
      info: {
        background: '#1e3a8a',
        border: '#3b82f6',
        text: '#dbeafe',
      },
      success: {
        background: '#064e3b',
        border: '#10b981',
        text: '#d1fae5',
      },
      warning: {
        background: '#78350f',
        border: '#f59e0b',
        text: '#fef3c7',
      },
      error: {
        background: '#7f1d1d',
        border: '#ef4444',
        text: '#fee2e2',
      },
    },
  },
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    secondary: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    success: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    warning: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    error: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
  },
  
  // Glass effect
  glass: {
    background: 'rgba(0, 0, 0, 0.1)',
    border: 'rgba(255, 255, 255, 0.1)',
    backdrop: 'blur(10px)',
  },
} as const;

export type DarkTheme = typeof darkTheme;
