'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../../components/admin/AdminLayout';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Select } from '../../../../components/ui/Select';
import { Alert } from '../../../../components/ui/Alert';
import { 
  ArrowLeft, 
  Save, 
  Palette,
  Tag,
  Check
} from 'lucide-react';
import { CreateCategoryData, CATEGORY_COLORS, CATEGORY_ICONS } from '../../../../types/category';
import { createCategory } from '../../../../lib/categories';

export default function CreateCategoryPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<CreateCategoryData>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Tag',
    isActive: true,
    sortOrder: 0
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Валидация
      if (!formData.name.trim()) {
        throw new Error('Название категории обязательно');
      }

      await createCategory(formData);
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

  return (
    <AdminLayout title="Создание категории" description="Создание новой категории для проектов">
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
              Создание категории
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Создайте новую категорию для проектов
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
            Категория успешно создана! Перенаправление...
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
              {isLoading ? 'Создание...' : 'Создать категорию'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
