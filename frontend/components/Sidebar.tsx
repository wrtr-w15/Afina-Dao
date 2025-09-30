'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Home, BookOpen, Users, ChevronRight, ChevronLeft } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
}

// Simple i18n function
const t = (key: string) => {
  const translations: Record<string, string> = {
    'navigation': 'Navigation',
    'availableProjects': 'Доступные проекты',
    'projectsComingSoon': 'Проекты будут добавлены позже',
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
  const [isExpanded, setIsExpanded] = useState(true);

  const sidebarItems = [
    { icon: Home, label: t('home'), href: '/' },
    { icon: BookOpen, label: t('howItWorks'), href: '/how-it-works' },
    { icon: Users, label: t('ourCases'), href: '/cases' },
    { icon: Search, label: t('faq'), href: '/faq' },
  ];

  return (
    <aside className={`fixed left-0 top-16 h-full w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
      isExpanded ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex flex-col h-full p-4">
        {/* Header */}
        <div className="mb-6 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('navigation')}</h2>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {sidebarItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('availableProjects')}</h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {t('projectsComingSoon')}
            </div>
          </div>
          
          {/* Powered By Afina */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{t('poweredBy')}</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{t('afina')}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}