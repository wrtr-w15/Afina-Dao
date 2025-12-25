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
    let isMounted = true;
    const CACHE_KEY = 'sidebar_projects';
    const CACHE_TIMESTAMP_KEY = 'sidebar_projects_timestamp';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

    const loadProjects = async () => {
      try {
        // Проверяем кэш с временной меткой
        if (typeof window !== 'undefined') {
          const cachedData = localStorage.getItem(CACHE_KEY);
          const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
          
          if (cachedData && cachedTimestamp) {
            const timestamp = parseInt(cachedTimestamp, 10);
            const now = Date.now();
            
            // Если кэш свежий (меньше 5 минут), используем его
            if (now - timestamp < CACHE_DURATION) {
              try {
                const cachedProjects = JSON.parse(cachedData);
                if (Array.isArray(cachedProjects) && cachedProjects.length > 0 && isMounted) {
                  setProjects(cachedProjects);
                  setIsLoading(false);
                  return; // Не загружаем заново, если кэш свежий
                }
              } catch (e) {
                console.error('Failed to parse cached projects:', e);
              }
            }
          }
        }

        // Загружаем свежие данные только если кэш устарел или отсутствует
        const allProjects = await getProjects();
        // Фильтруем только активные проекты для пользовательского сайдбара
        const activeProjects = allProjects.filter(project => project.status === 'active');
        
        if (isMounted) {
          setProjects(activeProjects);
          setIsLoading(false);
          
          // Кэшируем проекты с временной меткой
          if (typeof window !== 'undefined') {
            localStorage.setItem(CACHE_KEY, JSON.stringify(activeProjects));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          }
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProjects();

    // Слушаем события обновления кэша
    const handleCacheInvalidation = () => {
      loadProjects();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sidebarCacheInvalidated', handleCacheInvalidation);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('sidebarCacheInvalidated', handleCacheInvalidation);
      }
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
