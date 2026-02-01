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
  Globe,
  Image,
  Eye,
  Edit3
} from 'lucide-react';
import { CreateProjectData, PROJECT_STATUS_LABELS, parseMarkdownSections } from '../../../../types/project';
import { Category } from '../../../../types/category';
import { createProject } from '../../../../lib/projects';
import { getCategories } from '../../../../lib/categories';
import DOMPurify from 'isomorphic-dompurify';
import { normalizeErrorMessage } from '../../../../lib/error-utils';

export default function CreateProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    sidebarName: '',
    description: '',
    content: '',
    status: 'draft',
    category: '',
    startDate: '',
    deadline: '',
    budget: undefined,
    website: '',
    telegramPost: '',
    image: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      const activeCategories = categoriesData.filter(cat => cat.isActive);
      
      if (activeCategories.length > 0) {
        setFormData(prev => {
          const currentCategory = prev.category;
          const categoryExists = activeCategories.some(cat => cat.name === currentCategory);
          
          if (!currentCategory || !categoryExists) {
            return {
              ...prev,
              category: activeCategories[0].name
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Ошибка загрузки категорий. Проверьте подключение к серверу.');
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

  // Render Markdown to HTML
  const renderMarkdown = (content: string) => {
    const html = content
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-white mt-8 mb-4 pt-4 border-t border-white/10">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-6 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-blue-300">$1</code>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 text-gray-300">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-gray-300">$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-4" />')
      .replace(/\n\n/g, '</p><p class="mb-4 text-gray-300">')
      .replace(/\n/g, '<br>');
    
    return DOMPurify.sanitize(`<p class="mb-4 text-gray-300">${html}</p>`, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'li', 'p', 'br', 'code', 'a', 'img'],
      ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt']
    });
  };

  // Get preview sections
  const previewSections = parseMarkdownSections(formData.content || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.name.trim()) {
        throw new Error('Название проекта обязательно');
      }
      if (!formData.sidebarName.trim()) {
        throw new Error('Название для сайдбара обязательно');
      }
      if (!formData.description.trim()) {
        throw new Error('Описание проекта обязательно');
      }
      const activeCategories = categories.filter(cat => cat.isActive);
      if (activeCategories.length === 0) {
        throw new Error('Нет доступных активных категорий. Создайте категорию перед созданием проекта.');
      }
      if (!formData.category || !activeCategories.some(cat => cat.name === formData.category)) {
        throw new Error('Выберите категорию проекта');
      }

      const cleanFormData = {
        name: String(formData.name || ''),
        sidebarName: String(formData.sidebarName || ''),
        description: String(formData.description || ''),
        content: String(formData.content || ''),
        status: typeof formData.status === 'string' ? formData.status : 'draft',
        category: String(formData.category || ''),
        startDate: String(formData.startDate || ''),
        deadline: String(formData.deadline || ''),
        budget: formData.budget ? Number(formData.budget) : undefined,
        website: formData.website ? String(formData.website) : undefined,
        telegramPost: formData.telegramPost ? String(formData.telegramPost) : undefined,
        image: formData.image ? String(formData.image) : undefined,
        blocks: [] // Empty blocks for backward compatibility
      };

      await createProject(cleanFormData as any);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/projects');
      }, 1500);

    } catch (err) {
      setError(normalizeErrorMessage(err) || 'Произошла ошибка');
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
            <h1 className="text-3xl font-bold text-white">
              Создание проекта
            </h1>
            <p className="text-gray-400 mt-2">
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
            <Card className="p-6 bg-white/5 border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">
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
                  className="bg-white/5 border-white/10 text-white"
                />

                <Input
                  label="Название для сайдбара *"
                  name="sidebarName"
                  value={formData.sidebarName}
                  onChange={handleInputChange}
                  placeholder="Краткое название для отображения в сайдбаре"
                  required
                  className="bg-white/5 border-white/10 text-white"
                />

                <Textarea
                  label="Краткое описание *"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Краткое описание проекта (будет показано в начале страницы)"
                  rows={3}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Статус"
                    value={formData.status}
                    onChange={(e) => handleSelectChange('status', e.target.value)}
                    options={Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label
                    }))}
                  />

                  <Select
                    label="Категория *"
                    value={formData.category || ''}
                    onChange={(e) => handleSelectChange('category', e.target.value)}
                    options={categories
                      .filter(category => category.isActive)
                      .map(category => ({
                        value: category.name,
                        label: category.name
                      }))}
                    placeholder={categories.filter(cat => cat.isActive).length === 0 ? "Нет доступных категорий" : "Выберите категорию"}
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Ссылки */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">
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
                  className="bg-white/5 border-white/10 text-white"
                />

                <Input
                  label="Telegram Post"
                  name="telegramPost"
                  value={formData.telegramPost}
                  onChange={handleInputChange}
                  placeholder="https://t.me/afina_dao/123"
                  leftIcon={<Globe className="h-4 w-4" />}
                  className="bg-white/5 border-white/10 text-white"
                />

                <Input
                  label="Изображение (баннер)"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                  leftIcon={<Image className="h-4 w-4" />}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </Card>
          </div>

          {/* Markdown Content */}
          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Содержание проекта (Markdown)
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Используйте <code className="bg-white/10 px-1.5 py-0.5 rounded">### Заголовок</code> для создания разделов навигации
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                {showPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Редактор' : 'Превью'}
              </Button>
            </div>

            {showPreview ? (
              <div className="space-y-4">
                {/* Navigation preview */}
                {previewSections.length > 0 && (
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Навигация (разделы):</h3>
                    <div className="flex flex-wrap gap-2">
                      {previewSections.map((section, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                          {section.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Content preview */}
                <div 
                  className="prose prose-invert max-w-none p-6 bg-white/5 rounded-lg border border-white/10 min-h-[400px]"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.content || '*Введите содержание...*') }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder={`### Введение
Описание первого раздела...

### Установка
Шаги установки...

### Использование
Как использовать проект...

### FAQ
Часто задаваемые вопросы...`}
                  rows={20}
                  className="bg-white/5 border-white/10 text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Поддерживается: ### заголовки (для навигации), **жирный**, *курсив*, `код`, списки (- или 1.), [ссылки](url), ![изображения](url)
                </p>
              </div>
            )}
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
