import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './theme-provider';
import { THEME_NAMES } from './index';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeSwitcherProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'dropdown';
}

export function ThemeSwitcher({
  className = '',
  showLabel = false,
  size = 'md',
  variant = 'button',
}: ThemeSwitcherProps) {
  const { themeName, setTheme, isDark, isLight, isSystem } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const getCurrentIcon = () => {
    if (isSystem) return <Monitor className={iconSizes[size]} />;
    return isDark ? <Moon className={iconSizes[size]} /> : <Sun className={iconSizes[size]} />;
  };

  const getCurrentLabel = () => {
    if (isSystem) return 'System';
    return isDark ? 'Dark' : 'Light';
  };

  const handleThemeChange = (newTheme: typeof THEME_NAMES[keyof typeof THEME_NAMES]) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            ${sizeClasses[size]}
            flex items-center justify-center
            rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800
            text-gray-700 dark:text-gray-200
            hover:bg-gray-50 dark:hover:bg-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition-all duration-200
          `}
          aria-label="Toggle theme"
        >
          {getCurrentIcon()}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            <div className="py-1">
              {Object.entries({
                [THEME_NAMES.LIGHT]: { label: 'Light', icon: <Sun className="w-4 h-4" /> },
                [THEME_NAMES.DARK]: { label: 'Dark', icon: <Moon className="w-4 h-4" /> },
                [THEME_NAMES.SYSTEM]: { label: 'System', icon: <Monitor className="w-4 h-4" /> },
              }).map(([theme, { label, icon }]) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme as typeof THEME_NAMES[keyof typeof THEME_NAMES])}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-left
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors duration-150
                    ${themeName === theme ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}
                  `}
                >
                  {icon}
                  <span className="text-sm font-medium">{label}</span>
                  {themeName === theme && (
                    <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? THEME_NAMES.LIGHT : THEME_NAMES.DARK)}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-lg border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800
        text-gray-700 dark:text-gray-200
        hover:bg-gray-50 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500
        transition-all duration-200
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {getCurrentIcon()}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {getCurrentLabel()}
        </span>
      )}
    </button>
  );
}

// Alternative theme switcher with all options
export function ThemeSwitcherFull({
  className = '',
}: {
  className?: string;
}) {
  const { themeName, setTheme } = useTheme();

  const themes = [
    {
      name: THEME_NAMES.LIGHT,
      label: 'Light',
      icon: <Sun className="w-4 h-4" />,
      description: 'Light theme',
    },
    {
      name: THEME_NAMES.DARK,
      label: 'Dark',
      icon: <Moon className="w-4 h-4" />,
      description: 'Dark theme',
    },
    {
      name: THEME_NAMES.SYSTEM,
      label: 'System',
      icon: <Monitor className="w-4 h-4" />,
      description: 'Follow system',
    },
  ];

  return (
    <div className={`flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
      {themes.map((theme) => (
        <button
          key={theme.name}
          onClick={() => setTheme(theme.name)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
            transition-all duration-200
            ${themeName === theme.name
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }
          `}
        >
          {theme.icon}
          <span>{theme.label}</span>
        </button>
      ))}
    </div>
  );
}
