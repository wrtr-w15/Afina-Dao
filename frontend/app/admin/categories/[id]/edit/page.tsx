'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Textarea } from '../../../../../components/ui/Textarea';
import { Select } from '../../../../../components/ui/Select';
import { Alert } from '../../../../../components/ui/Alert';
import { 
  ArrowLeft, 
  Save, 
  Palette,
  Tag,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { Category, UpdateCategoryData, CATEGORY_COLORS, CATEGORY_ICONS } from '../../../../../types/category';
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
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      // Валидация
      if (!formData.name?.trim()) {
        throw new Error('Название категории обязательно');
      }

      await updateCategory(formData);
      setSuccess(true);
      
      // Перенаправление через 2 секунды
      setTimeout(() => {
        router.push('/admin/categories');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const colorOptions = CATEGORY_COLORS.map(color => ({
    value: color,
    label: color // Просто текст, без JSX
  }));

  const iconOptions = CATEGORY_ICONS.map(icon => ({
    value: icon,
    label: icon
  }));

  if (isLoadingData) {
    return (
      <AdminLayout title="Редактирование категории" description="Редактирование существующей категории">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Редактирование категории" description="Редактирование существующей категории">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Назад</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Редактирование категории
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Измените параметры категории
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            <Check className="h-4 w-4 mr-2" />
            Категория успешно обновлена! Перенаправление...
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Основная информация
            </h2>
            
            <div className="space-y-4">
              <Input
                label="Название категории *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Например: DeFi, NFT, Gaming"
                required
              />

              <Textarea
                label="Описание"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Краткое описание категории"
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Порядок сортировки"
                  name="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>
          </Card>

          {/* Внешний вид */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Внешний вид
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Цвет категории
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-full h-10 rounded-lg border-2 flex items-center justify-center ${
                        formData.color === color 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {formData.color === color && (
                        <span className="text-white text-sm font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <Palette className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Выбранный цвет: {formData.color}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Иконка
                </label>
                <Select
                  value={formData.icon}
                  onChange={(e) => handleSelectChange('icon', e.target.value)}
                  options={iconOptions}
                />
                <div className="mt-2 flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Выбранная иконка: {formData.icon}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Статус */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Статус категории
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Активность категории
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.isActive 
                      ? 'Категория активна и отображается в списках' 
                      : 'Категория неактивна и скрыта из списков'
                    }
                  </p>
                </div>
                <Button
                  type="button"
                  variant={formData.isActive ? "outline" : "primary"}
                  onClick={handleToggleActive}
                  className={`flex items-center space-x-2 ${
                    formData.isActive 
                      ? 'text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                      : 'text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
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
                      <span>Неактивна</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.back()}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
