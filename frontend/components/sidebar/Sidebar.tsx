'use client';

import { useState, useEffect } from 'react';
import LanguageSelector from '@/components/LanguageSelector';
import { getProjects } from '@/lib/projects';
import { Project } from '@/types/project';
import { useTranslations } from 'next-intl';
import MenuContent from '@/components/MenuContent';

export default function Sidebar() {
  const t = useTranslations('sidebar');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем кэш
    const cachedProjects = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sidebar_projects') || '[]') : [];
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('sidebar_projects', JSON.stringify(activeProjects));
        }
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

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-lg z-40">
      <div className="flex flex-col h-full">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <MenuContent projects={projects} isLoading={isLoading} />
        </div>

        {/* Footer */}
        <div className="p-4">
          <div className="transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Powered By Afina
              </div>
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
