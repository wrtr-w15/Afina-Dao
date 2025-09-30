'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import LanguageSelector from '../LanguageSelector';
import { getProjects } from '../../lib/projects';
import { Project } from '../../types/project';

// Simple i18n function
const t = (key: string) => {
  const translations: Record<string, string> = {
    'aboutAfina': 'Про Afina DAO',
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

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const allProjects = await getProjects();
        setProjects(allProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };

    loadProjects();
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
            <div className="p-4">
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('aboutAfina')}
                </h3>
              </div>
            </div>

                {/* Products Section */}
                <div className="p-4">
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {t('products')}
                    </h3>
                    {projects.length > 0 ? (
                      <div className="space-y-2">
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => router.push(`/project/${project.id}`)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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