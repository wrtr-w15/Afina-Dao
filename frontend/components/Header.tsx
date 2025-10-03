'use client';

import { useState, useEffect } from 'react';
import { Search, Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getProjects } from '@/lib/projects';
import { Project } from '@/types/project';
import { searchProjects, SearchResult } from '@/lib/search';
import LanguageSelector from './LanguageSelector';
import MenuContent from './MenuContent';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onMenuToggle?: () => void;
  className?: string;
  isSidebarCollapsed?: boolean;
}

export default function Header({ 
  onSearch, 
  onMenuToggle, 
  className = '',
  isSidebarCollapsed = false
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [mobileProjects, setMobileProjects] = useState<Project[]>([]);
  const [isMobileLoading, setIsMobileLoading] = useState(false);
  
  const { isDarkMode, toggleTheme } = useTheme();
  const t = useTranslations('search');
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
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setLastSearchQuery(value);
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const results = await searchProjects(searchQuery.trim());
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
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadMobileProjects = async () => {
    setIsMobileLoading(true);
    try {
      const projects = await getProjects();
      setMobileProjects(projects.filter(project => project.status === 'active'));
    } catch (error) {
      console.error('Error loading mobile projects:', error);
    } finally {
      setIsMobileLoading(false);
    }
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (!isMobileMenuOpen) {
      loadMobileProjects();
    }
  };

  const handleMobileSearchToggle = () => {
    if (!isMobileSearchOpen) {
      // При открытии восстанавливаем последний запрос
      setSearchQuery(lastSearchQuery);
    }
    setIsMobileSearchOpen(!isMobileSearchOpen);
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
  };

  const handleMobileSearchClose = () => {
    // Сохраняем текущий запрос перед закрытием
    setLastSearchQuery(searchQuery);
    setIsMobileSearchOpen(false);
  };

  const handleSearchResultClick = (result: SearchResult) => {
    console.log('🔍 Search result clicked:', {
      title: result.title,
      url: result.url,
      type: result.type
    });
    
    router.push(result.url);
    
    // Очищаем поиск
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
    
    console.log('✓ Navigating to:', result.url);
  };

  // Загрузка проектов для мобильного меню
  useEffect(() => {
    const loadMobileProjects = async () => {
      if (isMobileMenuOpen && mobileProjects.length === 0) {
        setIsMobileLoading(true);
        try {
          const projects = await getProjects();
          const activeProjects = projects.filter(project => project.status === 'active');
          setMobileProjects(activeProjects);
        } catch (error) {
          console.error('Error loading mobile projects:', error);
        } finally {
          setIsMobileLoading(false);
        }
      }
    };

    loadMobileProjects();
  }, [isMobileMenuOpen, mobileProjects.length]);


  const isActive = (path: string) => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === path;
    }
    return false;
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - максимально слева с картинкой */}
            <div className="flex items-center flex-shrink-0">
              <button 
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <img 
                  src="/images/purple afinka.png" 
                  alt="Afina DAO" 
                  className="w-8 h-8 rounded-md"
                />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
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

              {/* Search Bar - скрывается на маленьких экранах */}
              <div className="hidden sm:block relative">
                <form onSubmit={handleSearch}>
                  <Input
                    type="text"
                    placeholder={t('placeholder')}
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
                    className={`w-48 transition-all duration-200 ${
                      isSearchFocused 
                        ? 'ring-2 ring-blue-500 border-blue-500' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                </form>
                
                {/* Search Results Dropdown */}
                {isSearchFocused && (searchQuery.trim() || searchResults.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('searching')}...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-2">
                        {searchResults.map((result) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Предотвращаем blur
                              handleSearchResultClick(result);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {result.image && (
                                <img
                                  src={result.image}
                                  alt={result.title}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900 dark:text-white truncate">
                                    {result.title}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                    Проект
                                  </span>
                                </div>
                                {result.description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {result.description}
                                  </p>
                                )}
                                {result.category && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {result.category}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.trim() ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('noResults')}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Search Icon - показывается на маленьких экранах */}
              <button
                onClick={handleMobileSearchToggle}
                className="sm:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Search"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Mobile menu button - показывается на маленьких экранах */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMobileMenuToggle}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden">
          <div className="fixed inset-0 bg-white dark:bg-gray-900">
            {/* Mobile Search Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Поиск
                </h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMobileSearchClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Search Content */}
            <div className="p-4">
              <form onSubmit={handleSearch}>
                <Input
                  type="text"
                  placeholder={t('placeholder')}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  leftIcon={<Search className="h-4 w-4 text-gray-400" />}
                  className="w-full mb-4"
                />
              </form>
              
              {/* Search Results */}
              {isSearching ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('searching')}...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        handleSearchResultClick(result);
                        handleMobileMenuClose();
                      }}
                      className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {result.image && (
                          <img
                            src={result.image}
                            alt={result.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {result.title}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              Проект
                            </span>
                          </div>
                          {result.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {result.description}
                            </p>
                          )}
                          {result.category && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {result.category}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {t('noResults')}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Введите запрос для поиска
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden">
          <div className="fixed inset-0 bg-white dark:bg-gray-900">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <img 
                  src="/images/purple afinka.png" 
                  alt="Afina DAO" 
                  className="w-8 h-8 rounded-md"
                />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Afina DAO
                </h1>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMobileMenuClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <MenuContent 
                projects={mobileProjects} 
                isLoading={isMobileLoading} 
                onItemClick={handleMobileMenuClose}
              />
            </div>

            {/* Mobile Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Powered By Afina
                </div>
                <LanguageSelector />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}