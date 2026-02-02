'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  BarChart3, 
  FolderOpen, 
  Tag,
  ArrowRight,
  Activity,
  Eye,
  Users,
  CreditCard
} from 'lucide-react';
import { getCategories } from '@/lib/categories';

type UsersPerTariff = { tariffId: string; tariffName: string; count: number };

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalUsers: 0,
    usersWithPaidSubscription: 0,
    categories: 0,
    usersPerTariff: [] as UsersPerTariff[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [statsRes, categories] = await Promise.all([
          fetch('/api/admin/stats').then(r => r.ok ? r.json() : { users: {}, projectsTotal: 0, usersPerTariff: [] }),
          getCategories()
        ]);
        setStats({
          totalProjects: statsRes.projectsTotal ?? 0,
          totalUsers: statsRes.users?.total ?? 0,
          usersWithPaidSubscription: statsRes.users?.withPaidSubscription ?? 0,
          categories: categories.filter(c => c.isActive).length,
          usersPerTariff: Array.isArray(statsRes.usersPerTariff) ? statsRes.usersPerTariff : []
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const statCards = [
    {
      label: 'Всего проектов',
      value: stats.totalProjects,
      icon: FolderOpen,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Всего пользователей',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'С оплаченной подпиской',
      value: stats.usersWithPaidSubscription,
      icon: CreditCard,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      label: 'Категорий',
      value: stats.categories,
      icon: Tag,
      color: 'from-violet-500 to-purple-500',
      bgColor: 'bg-violet-500/10'
    }
  ];

  const quickActions = [
    {
      title: 'Создать проект',
      description: 'Добавить новый проект в базу',
      icon: FolderOpen,
      color: 'from-violet-500 to-purple-500',
      path: '/admin/projects/create'
    },
    {
      title: 'Создать категорию',
      description: 'Добавить новую категорию',
      icon: Tag,
      color: 'from-emerald-500 to-teal-500',
      path: '/admin/categories/create'
    },
    {
      title: 'Все проекты',
      description: 'Просмотреть и редактировать',
      icon: Eye,
      color: 'from-blue-500 to-cyan-500',
      path: '/admin/projects'
    }
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Добро пожаловать
          </h1>
          <p className="text-gray-400">
            Панель управления Afina DAO
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 p-5 hover:bg-white/[0.07] transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">
                      {loading ? '—' : stat.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{ color: 'currentColor' }} />
                  </div>
                </div>
                {/* Gradient line at bottom */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
            );
          })}
        </div>

        {/* Пользователи по тарифам */}
        {stats.usersPerTariff.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/5 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Пользователи по тарифам</h2>
            <div className="space-y-2">
              {stats.usersPerTariff.map((row) => (
                <div
                  key={row.tariffId}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="font-medium text-white">{row.tariffName}</span>
                  <span className="text-gray-400 tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => router.push(action.path)}
                  className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 p-5 hover:bg-white/[0.07] transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white group-hover:text-white transition-colors">
                        {action.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity Placeholder */}
          <div className="rounded-2xl bg-white/5 border border-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Навигация
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/projects')}
                className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white">Проекты</p>
                  <p className="text-sm text-gray-500">Управление проектами</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
              
              <button
                onClick={() => router.push('/admin/categories')}
                className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white">Категории</p>
                  <p className="text-sm text-gray-500">Управление категориями</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
              
              <button
                onClick={() => router.push('/admin/subscription-pricing')}
                className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white">Подписки</p>
                  <p className="text-sm text-gray-500">Настройка цен подписок</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Help Card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Подсказка
            </h3>
            <p className="text-gray-400 mb-4">
              Используйте боковое меню для навигации между разделами. 
              Для создания нового проекта используйте Markdown формат с заголовками ### для создания разделов навигации.
            </p>
            <div className="p-4 rounded-xl bg-black/20 font-mono text-sm text-gray-300">
              <p className="text-indigo-400">### Введение</p>
              <p className="text-gray-500">Описание раздела...</p>
              <p className="text-indigo-400 mt-2">### Установка</p>
              <p className="text-gray-500">Шаги установки...</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
