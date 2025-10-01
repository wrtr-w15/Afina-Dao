'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Textarea } from '../../../../../components/ui/Textarea';
import { Card } from '../../../../../components/ui/Card';
import { Alert } from '../../../../../components/ui/Alert';
import { ProjectBlockEditor } from '../../../../../components/ui/ProjectBlockEditor';
import { getProjectById, updateProject } from '../../../../../lib/projects';
import { getCategories } from '../../../../../lib/categories';
import { Project, ProjectStatus, ProjectCategory } from '../../../../../types/project';
import { Category } from '../../../../../types/category';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sidebarName: '',
    description: '',
    status: 'active' as ProjectStatus,
    category: '',
    website: '',
    telegramPost: '',
    image: '',
    blocks: [] as any[]
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [projectData, categoriesData] = await Promise.all([
          getProjectById(projectId),
          getCategories()
        ]);

        if (!projectData) {
          setError('Проект не найден');
          return;
        }

        setProject(projectData);
        setCategories(categoriesData);

        setFormData({
          name: projectData.name || '',
          sidebarName: projectData.sidebarName || '',
          description: projectData.description || '',
          status: projectData.status || 'active',
          category: projectData.category || '',
          budget: projectData.budget?.toString() || '',
          website: projectData.website || '',
          telegramPost: projectData.telegramPost || '',
          image: projectData.image || '',
          blocks: projectData.blocks || []
        });
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) {
      setError('ID проекта не найден');
      return;
    }
    
    if (!formData.name.trim() || !formData.sidebarName.trim()) {
      setError('Название проекта и название для сайдбара обязательны');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const cleanData = {
        ...formData,
        blocks: formData.blocks.filter(block => block && block.title && block.content)
      };

      await updateProject(projectId, cleanData);
      setSuccess('Проект успешно обновлен');
      
      setTimeout(() => {
        router.push('/admin/projects');
      }, 1500);
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Ошибка при обновлении проекта');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/projects');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка проекта...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Проект не найден
          </h1>
          <Button onClick={() => router.push('/admin/projects')}>
            Вернуться к проектам
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Назад</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Редактировать проект
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Обновите информацию о проекте
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="danger" className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            {success}
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Основная информация
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название проекта *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Введите название проекта"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название для сайдбара *
                </label>
                <Input
                  type="text"
                  value={formData.sidebarName}
                  onChange={(e) => handleInputChange('sidebarName', e.target.value)}
                  placeholder="Короткое название для сайдбара"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Активен</option>
                  <option value="draft">Черновик</option>
                  <option value="inactive">Не активен</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Категория
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Изображение проекта
                </label>
                <Input
                  type="url"
                  value={formData.image}
                  onChange={(e) => handleInputChange('image', e.target.value)}
                  placeholder="URL изображения"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Описание
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Описание проекта"
                rows={4}
              />
            </div>
          </Card>

          {/* Links */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Ссылки
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Веб-сайт
                </label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telegram Post
                </label>
                <Input
                  type="url"
                  value={formData.telegramPost}
                  onChange={(e) => handleInputChange('telegramPost', e.target.value)}
                  placeholder="https://t.me/..."
                />
              </div>
            </div>
          </Card>

          {/* Project Blocks */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Блоки описания
            </h2>
            
            <ProjectBlockEditor
              blocks={formData.blocks}
              onChange={(blocks) => handleInputChange('blocks', blocks)}
            />
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Отмена</span>
            </Button>
            
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
