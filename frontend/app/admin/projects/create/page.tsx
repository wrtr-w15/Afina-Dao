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
import { CreateProjectData, ProjectStatus, PROJECT_STATUS_LABELS } from '../../../../types/project';
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


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string | React.ChangeEvent<HTMLSelectElement>) => {
    const actualValue = typeof value === 'string' ? value : value.target.value;
    setFormData(prev => ({
      ...prev,
      [name]: actualValue
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
      if (!formData.category) {
        throw new Error('Выберите категорию проекта');
      }

      // Очистка данных перед отправкой - создаем полностью новые объекты
      const cleanFormData = {
        name: String(formData.name || ''),
        sidebarName: String(formData.sidebarName || ''),
        description: String(formData.description || ''),
        status: typeof formData.status === 'string' ? formData.status : 'draft',
        category: String(formData.category || ''),
        startDate: String(formData.startDate || ''),
        deadline: String(formData.deadline || ''),
        budget: formData.budget ? Number(formData.budget) : undefined,
        website: formData.website ? String(formData.website) : undefined,
        telegramPost: formData.telegramPost ? String(formData.telegramPost) : undefined,
        image: formData.image ? String(formData.image) : undefined,
        blocks: Array.isArray(formData.blocks) ? formData.blocks
          .filter(block => block && typeof block === 'object' && block.id)
          .map(block => ({
            id: String(block.id),
            title: String(block.title || ''),
            content: String(block.content || ''),
            gifUrl: block.gifUrl ? String(block.gifUrl) : undefined,
            links: Array.isArray(block.links) ? block.links
              .filter(link => link && typeof link === 'object' && link.id)
              .map(link => ({
                id: String(link.id),
                title: String(link.title || ''),
                url: String(link.url || ''),
                type: (link.type === 'website' || link.type === 'github' || link.type === 'documentation' || link.type === 'demo') ? link.type as 'website' | 'github' | 'documentation' | 'demo' : 'other'
              })) : []
          })) : []
      };

      // Отладочная информация
      console.log('Form data before cleaning:', formData);
      console.log('Clean form data:', cleanFormData);
      
      // Проверяем, что cleanFormData не содержит циклических ссылок
      try {
        JSON.stringify(cleanFormData);
        console.log('✅ cleanFormData is serializable');
      } catch (jsonError) {
        console.error('❌ cleanFormData contains circular references:', jsonError);
        throw new Error('Form data contains circular references');
      }

      // Создание проекта
      await createProject(cleanFormData as any);
      
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



          {/* Блоки описания */}
          <Card className="p-6">
            <ProjectBlockEditor
              blocks={formData.blocks || []}
              onChange={(blocks) => {
                // Обновляем блоки без автоматического сохранения
                setFormData(prev => ({ ...prev, blocks: blocks || [] }));
              }}
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