'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/admin/login');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Sidebar */}
      <div className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 flex flex-col ${
        sidebarCollapsed ? 'w-12' : 'w-64'
      }`}>
        {/* Header */}
        <div className={`border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Админ-панель
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Afina DAO
                </p>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto space-y-1 ${sidebarCollapsed ? 'p-1' : 'p-2'}`}>
          <button
            onClick={() => router.push('/admin')}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          >
            <span>📊</span>
            {!sidebarCollapsed && <span>Панель управления</span>}
          </button>
          
          <button
            onClick={() => router.push('/admin/projects')}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span>📁</span>
            {!sidebarCollapsed && <span>Проекты</span>}
          </button>
          
          <button
            onClick={() => router.push('/admin/categories')}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span>🏷️</span>
            {!sidebarCollapsed && <span>Категории</span>}
          </button>
        </nav>

        {/* Footer */}
        <div className={`flex-shrink-0 ${sidebarCollapsed ? 'p-1' : 'p-2'}`}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span>🚪</span>
            {!sidebarCollapsed && <span>Выйти</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-64'}`}>
        <div className="min-h-screen bg-white dark:bg-gray-900">
          <main className="p-6">
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
          </main>
        </div>
      </div>
    </div>
  );
}