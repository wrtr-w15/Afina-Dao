'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import LanguageSelector from '../LanguageSelector';
import { getProjects } from '../../lib/projects';
import { getCachedProjects, setCachedProjects, invalidateCache } from '../../lib/sidebarCache';
import { Project } from '../../types/project';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

// Simple i18n function
const t = (key: string) => {
  const translations: Record<string, string> = {
    'aboutAfina': 'Информация',
    'products': 'Продукты',
    'productsComingSoon': 'Продукты будут добавлены позже',
    'home': 'Home',
    'howItWorks': 'Как это работает',
    'ourCases': 'Наши кейсы',
    'faq': 'FAQ',
    'poweredBy': 'Powered By',
    'afina': 'Afina'
  };
  return translations[key] || key;
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAboutCollapsed, setIsAboutCollapsed] = useState(false);
  const [isProductsCollapsed, setIsProductsCollapsed] = useState(false);
  const [isAboutHovered, setIsAboutHovered] = useState(false);
  const [isProductsHovered, setIsProductsHovered] = useState(false);

  useEffect(() => {
    // Проверяем кэш
    const cachedProjects = getCachedProjects();
    if (cachedProjects) {
      setProjects(cachedProjects);
      setIsLoading(false);
    }

    const loadProjects = async () => {
      try {
        const allProjects = await getProjects();
        // Фильтруем только активные проекты для пользовательского сайдбара
        const activeProjects = allProjects.filter(project => project.status === 'active');
        setProjects(activeProjects);
        setIsLoading(false);
        
        // Кэшируем проекты
        setCachedProjects(activeProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        setIsLoading(false);
      }
    };

    // Загружаем проекты только если их нет в кэше
    if (!cachedProjects) {
      loadProjects();
    }

    // Слушаем события обновления кэша
    const handleCacheInvalidation = () => {
      loadProjects();
    };

    window.addEventListener('sidebarCacheInvalidated', handleCacheInvalidation);

    return () => {
      window.removeEventListener('sidebarCacheInvalidated', handleCacheInvalidation);
    };
  }, []);

  const sidebarItems = [];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-lg z-40">
        <div className="flex flex-col h-full">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {/* About Afina DAO Section */}
            <div className="p-4 pb-2">
              <div className="text-left">
                <button
                  onClick={() => setIsAboutCollapsed(!isAboutCollapsed)}
                  onMouseEnter={() => setIsAboutHovered(true)}
                  onMouseLeave={() => setIsAboutHovered(false)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <span>{t('aboutAfina')}</span>
                  <div className={`transition-all duration-200 ease-in-out ${
                    isAboutHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {isAboutCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isAboutCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                  }`}
                >
                  <button
                    onClick={() => {
                      console.log('About Afina DAO clicked');
                      router.push('/about');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                      isActive('/about') 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <BookOpen className={`h-4 w-4 ${
                      isActive('/about') 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                    Про Afina DAO
                  </button>
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="p-4 pt-2">
              <div className="text-left">
                <button
                  onClick={() => setIsProductsCollapsed(!isProductsCollapsed)}
                  onMouseEnter={() => setIsProductsHovered(true)}
                  onMouseLeave={() => setIsProductsHovered(false)}
                  className="flex items-center justify-between w-full text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <span>{t('products')}</span>
                  <div className={`transition-all duration-200 ease-in-out ${
                    isProductsHovered ? 'opacity-100' : 'opacity-0'
                  }`}>
                    {isProductsCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isProductsCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                  }`}
                >
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="px-3 py-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="space-y-2">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => router.push(`/project/${project.id}`)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive(`/project/${project.id}`) 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {project.sidebarName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {t('productsComingSoon')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Powered By Afina + Language Selector */}
          <div className="flex-shrink-0 p-4">
            <div className="flex items-center justify-between">
              {/* Left side - Powered By Afina */}
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{t('poweredBy')}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {t('afina')}
                </span>
              </div>
              
              {/* Right side - Language Selector */}
              <LanguageSelector />
            </div>
          </div>
        </div>
      </aside>
  );
}