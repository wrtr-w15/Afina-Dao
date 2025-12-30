'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Palette,
  Tag,
  ArrowLeft
} from 'lucide-react';
import { Category, CATEGORY_COLORS, CATEGORY_ICONS } from '../../../types/category';
import { getCategories, deleteCategory, getCategoriesStats, updateCategory } from '../../../lib/categories';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [categories, searchQuery]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [categoriesData, statsData] = await Promise.all([
        getCategories(),
        getCategoriesStats()
      ]);
      setCategories(categoriesData);
      setStats(statsData);
      if (categoriesData.length === 0) {
        // Не показываем ошибку, если просто нет категорий - это нормально
        console.log('No categories found');
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Ошибка загрузки категорий: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'));
    } finally {
      setIsLoading(false);
    }
  };

  const filterCategories = () => {
    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredCategories(filtered);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить категорию "${name}"?`)) {
      return;
    }

    try {
      await deleteCategory(id);
      await loadCategories();
      setError(''); // Очищаем предыдущие ошибки при успешном удалении
    } catch (err: any) {
      console.log('Delete category error:', err); // Логируем для отладки
      
      // Проверяем, если это ошибка о том, что категория используется в проектах
      if (err.message && err.message.includes('Cannot delete category that is used in projects')) {
        setError('❌ Нельзя удалить категорию, которая используется в проектах. Используйте кнопку деактивации (👁️) вместо удаления.');
      } else if (err.status === 400) {
        setError('❌ Нельзя удалить эту категорию. Возможно, она используется в проектах. Попробуйте деактивировать её.');
      } else {
        setError('❌ Ошибка при удалении категории: ' + (err.message || 'Неизвестная ошибка'));
      }
      
      // Автоматически скрываем ошибку через 5 секунд
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };

  const toggleCategoryStatus = async (category: Category) => {
    try {
      await updateCategory({
        id: category.id,
        isActive: !category.isActive
      });
      await loadCategories();
    } catch (err) {
      setError('Ошибка при изменении статуса категории');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Управление категориями" description="Создание и управление категориями проектов">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Управление категориями" description="Создание и управление категориями проектов">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Назад</span>
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Управление категориями
              </h1>
            </div>
          </div>
          <Button size="sm" onClick={() => router.push('/admin/categories/create')}>
            <Plus className="h-3 w-3 mr-1" />
            Создать
          </Button>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {/* Статистика */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Всего: <span className="font-semibold text-blue-600">{stats.total}</span></span>
          <span>Активных: <span className="font-semibold text-green-600">{stats.active}</span></span>
          <span>Неактивных: <span className="font-semibold text-gray-600">{stats.inactive}</span></span>
        </div>

        {/* Поиск */}
        <div className="max-w-md">
          <Input
            placeholder="Поиск категорий..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="text-sm"
          />
        </div>

        {/* Список категорий */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    {category.icon && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <Tag className="h-3 w-3 inline mr-1" />
                        {category.icon}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCategoryStatus(category)}
                    className={`${
                      category.isActive 
                        ? 'text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                        : 'text-gray-400 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    title={category.isActive ? 'Деактивировать' : 'Активировать'}
                  >
                    {category.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/categories/${category.id}/edit`)}
                    title="Редактировать"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCategoryStatus(category)}
                    className={`${category.isActive ? 'text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                    title={category.isActive ? 'Деактивировать' : 'Активировать'}
                  >
                    {category.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {category.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {category.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <Badge 
                  variant={category.isActive ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {category.isActive ? 'Активна' : 'Неактивна'}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Порядок: {category.sortOrder}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <Card className="p-8 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Категории не найдены
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте первую категорию'}
            </p>
            <Button onClick={() => router.push('/admin/categories/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Создать категорию
            </Button>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
