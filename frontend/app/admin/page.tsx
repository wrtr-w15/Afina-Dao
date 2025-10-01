'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/admin/AdminLayout';

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <AdminLayout title="Панель управления" description="Добро пожаловать в админ панель Afina DAO">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Панель управления
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Добро пожаловать в админ панель Afina DAO
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <span className="text-2xl">📁</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Проекты
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Управление проектами
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/admin/projects')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Перейти к проектам
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <span className="text-2xl">🏷️</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Категории
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Управление категориями
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/admin/categories')}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Перейти к категориям
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}