'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  FolderOpen, 
  LogOut,
  Tag
} from 'lucide-react';
import { logoutAdmin, removeAdminTokenFromCookies } from '../../lib/auth';

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    logoutAdmin();
    removeAdminTokenFromCookies();
    router.push('/admin/login');
  };

  // Количество доступных проектов
  const availableProjectsCount = 3;

  return (
    <AdminLayout 
      title="Панель управления"
      description="Главная панель администратора"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Панель администратора
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Управление проектами Afina DAO
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Projects Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Доступные проекты
              </h2>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                {availableProjectsCount} проектов
              </Badge>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Управляйте доступными проектами и их статусом
            </p>
            
            <div className="flex space-x-3">
              <Button 
                className="flex-1"
                onClick={() => router.push('/admin/projects')}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Перейти к проектам
              </Button>
            </div>
          </Card>

          {/* Categories Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Категории проектов
              </h2>
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                7 категорий
              </Badge>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Управляйте категориями для организации проектов
            </p>
            
            <div className="flex space-x-3">
              <Button 
                className="flex-1"
                onClick={() => router.push('/admin/categories')}
              >
                <Tag className="h-4 w-4 mr-2" />
                Управление категориями
              </Button>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Статистика
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Доступных проектов:</span>
                <span className="text-2xl font-bold text-blue-600">{availableProjectsCount}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Активных:</span>
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">В разработке:</span>
                <span className="text-2xl font-bold text-orange-600">1</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}