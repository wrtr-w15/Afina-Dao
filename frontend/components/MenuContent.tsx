'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { menuConfig } from '@/config/menu';
import { Project } from '@/types/project';

interface MenuContentProps {
  projects: Project[];
  isLoading?: boolean;
  onItemClick?: () => void;
  className?: string;
}

export default function MenuContent({ projects, isLoading = false, onItemClick, className = '' }: MenuContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [hoveredCategories, setHoveredCategories] = useState<Record<string, boolean>>({});
  const [isProductsCollapsed, setIsProductsCollapsed] = useState(false);
  const [isProductsHovered, setIsProductsHovered] = useState(false);

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleItemClick = (href: string) => {
    router.push(href);
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Render menu categories from config */}
      {menuConfig.map((category) => (
        <div key={category.id} className="mb-6">
          <div className="text-left">
            <button
              onClick={() => toggleCategory(category.id)}
              onMouseEnter={() => setHoveredCategories(prev => ({ ...prev, [category.id]: true }))}
              onMouseLeave={() => setHoveredCategories(prev => ({ ...prev, [category.id]: false }))}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <span>{t(category.translationKey)}</span>
              <div className={`transition-all duration-200 ease-in-out ${
                hoveredCategories[category.id] ? 'opacity-100' : 'opacity-0'
              }`}>
                {collapsedCategories[category.id] ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>
            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                collapsedCategories[category.id] ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
              }`}
            >
              {category.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.href)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                      isActive(item.href) 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${
                      isActive(item.href) 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                    <span className="flex-1">{t(item.translationKey)}</span>
                    {item.isNew && (
                      <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-green-500 text-white dark:bg-green-600">
                        {t('new')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Products Section */}
      <div className="mb-6">
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
                    onClick={() => handleItemClick(`/project/${project.id}`)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive(`/project/${project.id}`) 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="truncate">{project.sidebarName || project.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {t('noProjects')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

