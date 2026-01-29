'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import { 
  ArrowLeft, 
  Save, 
  Palette,
  Tag,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { UpdateCategoryData, CATEGORY_COLORS, CATEGORY_ICONS } from '../../../../../types/category';
import { getCategoryById, updateCategory } from '../../../../../lib/categories';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<UpdateCategoryData>({
    id: categoryId,
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Tag',
    isActive: true,
    sortOrder: 0
  });

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  const loadCategory = async () => {
    try {
      setIsLoadingData(true);
      const category = await getCategoryById(categoryId);
      if (category) {
        setFormData({
          id: category.id,
          name: category.name,
          description: category.description || '',
          color: category.color,
          icon: category.icon || 'Tag',
          isActive: category.isActive,
          sortOrder: category.sortOrder
        });
      } else {
        setError('Категория не найдена');
      }
    } catch (err) {
      setError('Ошибка загрузки категории');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 0 : value
    }));
  };

  const handleToggleActive = () => {
    setFormData(prev => ({
      ...prev,
      isActive: !prev.isActive
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.name?.trim()) {
        throw new Error('Название категории обязательно');
      }

      await updateCategory(formData);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/admin/categories');
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Редактирование
            </h1>
            <p className="text-gray-400 text-sm">
              {formData.name}
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Категория обновлена! Перенаправление...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Tag className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="font-semibold text-white">Основная информация</h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Название <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="DeFi, NFT, Gaming..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Краткое описание категории"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Palette className="h-5 w-5 text-violet-400" />
              </div>
              <h2 className="font-semibold text-white">Внешний вид</h2>
            </div>
            
            <div className="p-5 space-y-5">
              {/* Color Picker */}
              <div>
                <label className="block text-sm text-gray-400 mb-3">
                  Цвет категории
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${
                        formData.color === color 
                          ? 'border-white scale-110 shadow-lg' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {formData.color === color && (
                        <CheckCircle className="h-4 w-4 text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm text-gray-500">{formData.color}</span>
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-sm text-gray-400 mb-3">
                  Иконка
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50 transition-all"
                >
                  {CATEGORY_ICONS.map(icon => (
                    <option key={icon} value={icon} className="bg-[#1a1a2e]">
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                formData.isActive ? 'bg-emerald-500/20' : 'bg-gray-500/20'
              }`}>
                {formData.isActive ? (
                  <Eye className="h-5 w-5 text-emerald-400" />
                ) : (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <h2 className="font-semibold text-white">Статус</h2>
            </div>
            
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    {formData.isActive ? 'Категория активна' : 'Категория скрыта'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formData.isActive 
                      ? 'Отображается в списках' 
                      : 'Не отображается в списках'
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    formData.isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                      : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                  }`}
                >
                  {formData.isActive ? (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>Активна</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" />
                      <span>Скрыта</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
