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
  Home,
  Users,
  CreditCard,
  Receipt,
  Wallet,
  MessageCircle
} from 'lucide-react';
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
      label: 'Дашборд',
      icon: LayoutDashboard,
      path: '/admin',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'projects',
      label: 'Проекты',
      icon: FolderOpen,
      path: '/admin/projects',
      color: 'from-violet-500 to-purple-500'
    },
    {
      id: 'categories',
      label: 'Категории',
      icon: Tag,
      path: '/admin/categories',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'subscriptions',
      label: 'Подписки',
      icon: CreditCard,
      path: '/admin/subscriptions',
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'users',
      label: 'Пользователи',
      icon: Users,
      path: '/admin/users',
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'payments',
      label: 'Платежи',
      icon: Receipt,
      path: '/admin/payments',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'tariffs',
      label: 'Тарифы',
      icon: Wallet,
      path: '/admin/tariffs',
      color: 'from-indigo-500 to-violet-500'
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: MessageCircle,
      path: '/admin/telegram',
      color: 'from-sky-500 to-blue-500'
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: Settings,
      path: '/admin/settings',
      color: 'from-slate-500 to-gray-500'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className={`fixed left-0 top-0 bottom-0 bg-[#12121a]/80 backdrop-blur-xl border-r border-white/5 transition-all duration-300 z-40 flex flex-col ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className={`border-b border-white/5 flex-shrink-0 ${isCollapsed ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Афина Админ
                </h2>
                <p className="text-xs text-gray-500">
                  Панель управления
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
          )}
        </div>
        
        {/* Toggle button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={`absolute -right-3 top-6 w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#252538] transition-all shadow-lg`}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        <div className="space-y-1">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'} rounded-xl transition-all duration-200 group ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  active 
                    ? `bg-gradient-to-br ${item.color} shadow-lg` 
                    : 'bg-white/5 group-hover:bg-white/10'
                }`}>
                  <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                </div>
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className={`flex-shrink-0 border-t border-white/5 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {/* Back to site */}
        <button
          onClick={() => router.push('/')}
          className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'} rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all mb-2`}
          title={isCollapsed ? 'На сайт' : undefined}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Home className="h-4 w-4" />
          </div>
          {!isCollapsed && <span className="font-medium text-sm">На сайт</span>}
        </button>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 ${isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'} rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all`}
          title={isCollapsed ? 'Выйти' : undefined}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <LogOut className="h-4 w-4" />
          </div>
          {!isCollapsed && <span className="font-medium text-sm">Выйти</span>}
        </button>
      </div>
    </div>
  );
}
