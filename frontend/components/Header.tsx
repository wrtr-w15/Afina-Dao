'use client';

import { useState } from 'react';
import { Search, Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  className?: string;
}

export default function Header({ 
  onSearch, 
  onMenuToggle, 
  showMenuButton = false,
  className = '' 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

      return (
        <header className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - максимально слева */}
          <div className="flex items-center flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Afina DAO
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wiki
                </p>
              </div>
            </div>
          </div>

              {/* Right side - Theme Toggle, Search and Menu - максимально справа */}
              <div className="flex items-center space-x-4 ml-auto">
                {/* Theme Toggle Button */}
                <button
                  onClick={handleThemeToggle}
                  className="p-2 transition-colors"
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {/* Search Bar */}
                <div className="hidden sm:block">
                  <form onSubmit={handleSearch}>
                    <Input
                      type="text"
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      leftIcon={
                        <Search className={`h-4 w-4 transition-colors duration-200 ${
                          isSearchFocused 
                            ? 'text-blue-500' 
                            : 'text-gray-400'
                        }`} />
                      }
                      className={`w-64 transition-all duration-200 ${
                        isSearchFocused 
                          ? 'ring-2 ring-blue-500 border-blue-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </form>
                </div>

                {/* Mobile menu button */}
                {showMenuButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMenuToggle}
                    className="sm:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
              </div>
        </div>
      </div>
    </header>
  );
}