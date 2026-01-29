'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/admin/AdminLayout';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Category } from '../../../types/category';
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
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Ошибка загрузки категорий');
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
    if (!confirm(`Удалить категорию "${name}"?`)) return;

    try {
      await deleteCategory(id);
      await loadCategories();
      setError('');
    } catch (err: any) {
      if (err.message?.includes('Cannot delete category that is used')) {
        setError('Нельзя удалить категорию, которая используется в проектах. Деактивируйте её вместо удаления.');
      } else {
        setError('Ошибка при удалении категории');
      }
      setTimeout(() => setError(''), 5000);
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
      setError('Ошибка при изменении статуса');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Категории">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Категории">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Категории
            </h1>
            <p className="text-gray-400 text-sm">
              Управление категориями проектов
            </p>
          </div>
          <button 
            onClick={() => router.push('/admin/categories/create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
          >
            <Plus className="h-4 w-4" />
            Создать категорию
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">Всего:</span>
            <span className="text-white font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-500 text-sm">Активных:</span>
            <span className="text-emerald-400 font-semibold">{stats.active}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-gray-500 text-sm">Неактивных:</span>
            <span className="text-gray-400 font-semibold">{stats.inactive}</span>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск категорий..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <div 
              key={category.id} 
              className={`rounded-2xl bg-white/5 border overflow-hidden transition-all ${
                category.isActive 
                  ? 'border-white/10 hover:border-white/20' 
                  : 'border-white/5 opacity-60'
              }`}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {category.name}
                      </h3>
                      {category.icon && (
                        <span className="text-xs text-gray-500">
                          {category.icon}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    category.isActive 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {category.isActive ? 'Активна' : 'Неактивна'}
                  </span>
                </div>

                {/* Description */}
                {category.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => toggleCategoryStatus(category)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm ${
                      category.isActive
                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {category.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {category.isActive ? 'Скрыть' : 'Показать'}
                  </button>
                  <button 
                    onClick={() => router.push(`/admin/categories/${category.id}/edit`)}
                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCategories.length === 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/5 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-gray-400 mb-4">
              {searchQuery ? 'Категории не найдены' : 'Категории не созданы'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => router.push('/admin/categories/create')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                <Plus className="h-4 w-4" />
                Создать первую категорию
              </button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
