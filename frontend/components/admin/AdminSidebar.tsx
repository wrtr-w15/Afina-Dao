'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  FolderOpen,
  Tag,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/Button';
import { logoutAdmin, removeAdminTokenFromCookies } from '../../lib/auth';

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
}

export default function AdminSidebar({ isCollapsed = false, onToggle, onLogout }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logoutAdmin();
      removeAdminTokenFromCookies();
      router.push('/admin/login');
    }
  };

  const adminMenuItems = [
    {
      id: 'dashboard',
      label: 'Панель управления',
      icon: LayoutDashboard,
      path: '/admin',
      description: 'Главная панель'
    },
    {
      id: 'projects',
      label: 'Проекты',
      icon: FolderOpen,
      path: '/admin/projects',
      description: 'Управление проектами'
    },
    {
      id: 'categories',
      label: 'Категории',
      icon: Tag,
      path: '/admin/categories',
      description: 'Управление категориями'
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: Settings,
      path: '/admin/settings',
      description: 'Системные настройки'
    },
    {
      id: 'subscription-pricing',
      label: 'Цены подписок',
      icon: DollarSign,
      path: '/admin/subscription-pricing',
      description: 'Управление ценами Private Community'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 flex flex-col ${
      isCollapsed ? 'w-12' : 'w-64'
    }`}>
      {/* Header */}
      <div className={`border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Админ-панель
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Afina DAO
              </p>
            </div>
          )}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto space-y-1 ${isCollapsed ? 'p-1' : 'p-2'}`}>
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center space-x-0 px-1 py-1' : 'space-x-2 px-2 py-1.5'} rounded-md transition-colors text-sm ${
                active
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`flex-shrink-0 ${isCollapsed ? 'p-1' : 'p-2'}`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center space-x-0 px-1 py-1' : 'space-x-2 px-2 py-1.5'} rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Выйти</span>}
        </button>
      </div>
    </div>
  );
}