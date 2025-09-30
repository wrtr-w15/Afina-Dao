'use client';

import React, { useState, useEffect } from 'react';
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
  X,
  Plus,
  Calendar,
  Users,
  Code,
  DollarSign,
  Globe,
  Github,
  Image
} from 'lucide-react';
import { CreateProjectData, ProjectStatus, PROJECT_STATUS_LABELS, OSCompatibility, OS_COMPATIBILITY_LABELS, OS_COMPATIBILITY_ICONS } from '../../../../types/project';
import { Category } from '../../../../types/category';
import { ProjectBlockEditor } from '../../../../components/ui/ProjectBlockEditor';
import { createProject } from '../../../../lib/projects';
import { getCategories } from '../../../../lib/categories';

export default function CreateProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    sidebarName: '',
    description: '',
    status: 'draft',
    category: '',
    startDate: '',
    deadline: '',
    budget: undefined,
    website: '',
    telegramPost: '',
    image: '',
    compatibility: [],
    blocks: []
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      // Устанавливаем первую категорию по умолчанию, если есть
      if (categoriesData.length > 0 && !formData.category) {
        setFormData(prev => ({
          ...prev,
          category: categoriesData[0].name
        }));
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const toggleCompatibility = (os: OSCompatibility) => {
    setFormData(prev => ({
      ...prev,
      compatibility: prev.compatibility.includes(os)
        ? prev.compatibility.filter(o => o !== os)
        : [...prev.compatibility, os]
    }));
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Валидация
      if (!formData.name.trim()) {
        throw new Error('Название проекта обязательно');
      }
      if (!formData.sidebarName.trim()) {
        throw new Error('Название для сайдбара обязательно');
      }
      if (!formData.description.trim()) {
        throw new Error('Описание проекта обязательно');
      }
      if (formData.compatibility.length === 0) {
        throw new Error('Выберите хотя бы одну совместимую ОС');
      }
      if (!formData.category) {
        throw new Error('Выберите категорию проекта');
      }

      // Очистка данных перед отправкой
      const cleanFormData = {
        ...formData,
        blocks: formData.blocks.filter(block => block && block.id) // Убираем пустые блоки
      };

      // Создание проекта
      await createProject(cleanFormData);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/projects');
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout 
      title="Создание проекта"
      description="Создание нового проекта"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Создание проекта
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Заполните информацию о новом проекте
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
            Проект успешно создан! Перенаправление...
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Основная информация */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Основная информация
              </h2>
              
              <div className="space-y-4">
                <Input
                  label="Название проекта *"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Введите название проекта"
                  required
                />

                <Input
                  label="Название для сайдбара *"
                  name="sidebarName"
                  value={formData.sidebarName}
                  onChange={handleInputChange}
                  placeholder="Краткое название для отображения в сайдбаре"
                  required
                />

                <Textarea
                  label="Описание *"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Опишите проект"
                  rows={4}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Статус"
                    value={formData.status}
                    onChange={(value) => handleSelectChange('status', value)}
                    options={Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label
                    }))}
                  />

                  <Select
                    label="Категория"
                    value={formData.category}
                    onChange={(value) => handleSelectChange('category', value)}
                    options={categories.map(category => ({
                      value: category.name,
                      label: category.name
                    }))}
                  />
                </div>

              </div>
            </Card>

          </div>


          {/* Совместимость ОС */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Совместимость ОС
            </h2>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Выберите операционные системы, с которыми совместим проект
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(OS_COMPATIBILITY_LABELS).map(([os, label]) => (
                  <button
                    key={os}
                    type="button"
                    onClick={() => toggleCompatibility(os as OSCompatibility)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.compatibility.includes(os as OSCompatibility)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">
                        {OS_COMPATIBILITY_ICONS[os as OSCompatibility]}
                      </div>
                      <div className="text-sm font-medium">{label}</div>
                    </div>
                  </button>
                ))}
              </div>
              
              {formData.compatibility.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.compatibility.map((os) => (
                    <span 
                      key={os}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      {OS_COMPATIBILITY_ICONS[os]} {OS_COMPATIBILITY_LABELS[os]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Блоки описания */}
          <Card className="p-6">
            <ProjectBlockEditor
              blocks={formData.blocks || []}
              onChange={(blocks) => setFormData(prev => ({ ...prev, blocks: blocks || [] }))}
            />
          </Card>

          {/* Ссылки */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ссылки
            </h2>
            
            <div className="space-y-4">
              <Input
                label="Веб-сайт"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
                leftIcon={<Globe className="h-4 w-4" />}
              />

              <Input
                label="Telegram Post"
                name="telegramPost"
                value={formData.telegramPost}
                onChange={handleInputChange}
                placeholder="https://t.me/afina_dao/123"
                leftIcon={<Globe className="h-4 w-4" />}
              />

              <Input
                label="Изображение"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                leftIcon={<Image className="h-4 w-4" />}
              />
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
              {isLoading ? 'Создание...' : 'Создать проект'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}