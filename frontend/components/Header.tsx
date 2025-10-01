'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useTheme } from '../contexts/ThemeContext';
import { searchProjects } from '../lib/projects';
import { Project } from '../types/project';

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
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      try {
        const results = await searchProjects(searchQuery.trim());
        setSearchResults(results);
        if (onSearch) {
          onSearch(searchQuery.trim());
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim().length > 2) {
      setIsSearching(true);
      try {
        const results = await searchProjects(value.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/project/${projectId}`);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const handleLogoClick = () => {
    router.push('/');
  };

      return (
        <header className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - максимально слева */}
          <div className="flex items-center flex-shrink-0">
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img 
                src="/images/purple afinka.png" 
                alt="Afina DAO Logo" 
                className="w-8 h-8 object-contain rounded-md"
              />
              <div className="hidden sm:block">
                <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                  Afina DAO
                </h1>
              </div>
            </button>
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
                    <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {/* Search Bar */}
                <div className="hidden sm:block relative">
                  <form onSubmit={handleSearch}>
                    <Input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      leftIcon={
                        isSearching ? (
                          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                        ) : (
                          <Search className={`h-4 w-4 transition-colors duration-200 ${
                            isSearchFocused 
                              ? 'text-blue-500' 
                              : 'text-gray-400'
                          }`} />
                        )
                      }
                      className={`w-64 transition-all duration-200 ${
                        isSearchFocused 
                          ? 'ring-2 ring-blue-500 border-blue-500' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </form>
                  
                  {/* Search Results Dropdown */}
                  {isSearchFocused && (searchResults.length > 0 || searchQuery.trim().length > 2) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <div className="p-2">
                          {searchResults.map((project) => (
                            <button
                              key={project.id}
                              onClick={() => handleProjectClick(project.id)}
                              className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                {project.image && (
                                  <img 
                                    src={project.image} 
                                    alt={project.name}
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {project.sidebarName}
                                  </h3>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {project.category}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : searchQuery.trim().length > 2 && !isSearching ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          <p className="text-sm">No projects found</p>
                        </div>
                      ) : null}
                    </div>
                  )}
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