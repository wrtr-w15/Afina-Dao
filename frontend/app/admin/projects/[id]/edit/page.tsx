'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft, Save, Globe, Eye, Edit3, Image } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode, DEFAULT_LANGUAGE } from '@/config/languages';
import { getProjectById, updateProject } from '@/lib/projects';
import { getCategories } from '@/lib/categories';
import { Category } from '@/types/category';
import { parseMarkdownSections } from '@/types/project';
import DOMPurify from 'isomorphic-dompurify';

interface ProjectTranslation {
  locale: string;
  name: string;
  description: string;
  content: string;
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentLang, setCurrentLang] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState({
    sidebarName: '',
    status: 'draft' as 'active' | 'draft' | 'inactive',
    category: '',
    website: '',
    telegramPost: '',
    image: '',
    translations: {} as Record<LanguageCode, ProjectTranslation>
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [project, categoriesData] = await Promise.all([
        getProjectById(projectId),
        getCategories()
      ]);
      
      if (!project) {
        setError('Project not found');
        setIsLoading(false);
        return;
      }
      
      setCategories(categoriesData);
      
      // Initialize translations for all languages
      const translations: Record<LanguageCode, ProjectTranslation> = {} as any;
      SUPPORTED_LANGUAGES.forEach(lang => {
        const translation = project.translations?.find((t: any) => t.locale === lang.code);
        translations[lang.code] = {
          locale: lang.code,
          name: translation?.name || project.name || '',
          description: translation?.description || project.description || '',
          content: translation?.content || project.content || ''
        };
      });
      
      setFormData({
        sidebarName: project.sidebarName || '',
        status: project.status || 'draft',
        category: project.category || '',
        website: project.website || '',
        telegramPost: project.telegramPost || '',
        image: project.image || '',
        translations
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Ошибка загрузки проекта');
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      
      console.log('Saving project...');
      
      await updateProject(projectId, {
        sidebarName: formData.sidebarName,
        status: formData.status,
        category: formData.category,
        website: formData.website,
        telegramPost: formData.telegramPost,
        image: formData.image,
        // Use content from default language as base
        content: formData.translations[DEFAULT_LANGUAGE]?.content || '',
        translations: Object.values(formData.translations)
      });
      
      console.log('✅ Project saved successfully!');
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/projects');
      }, 1500);
    } catch (err) {
      console.error('Error saving project:', err);
      setError(err instanceof Error ? err.message : 'Ошибка сохранения проекта');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTranslation = (field: 'name' | 'description' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [currentLang]: {
          ...prev.translations[currentLang],
          [field]: value
        }
      }
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

  // Get preview sections for current language
  const currentContent = formData.translations[currentLang]?.content || '';
  const previewSections = parseMarkdownSections(currentContent);

  if (isLoading) {
    return (
      <AdminLayout title="Редактирование проекта">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Загрузка...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Редактирование проекта">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/projects')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к проектам
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <p className="text-green-300">Проект успешно сохранен!</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Language Selector */}
        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Выберите язык для редактирования
            </h2>
          </div>
          <div className="flex gap-2">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setCurrentLang(lang.code)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentLang === lang.code
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Common Fields (no translation) */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Общие настройки (без перевода)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название в сайдбаре *
              </label>
              <Input
                value={formData.sidebarName}
                onChange={(e) => setFormData(prev => ({ ...prev, sidebarName: e.target.value }))}
                placeholder="Короткое название для сайдбара"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Статус *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white"
              >
                <option value="active">Активен</option>
                <option value="draft">Черновик</option>
                <option value="inactive">Не активен</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Категория *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white"
              >
                <option value="">Выберите категорию</option>
                {categories.filter(c => c.isActive).map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Веб-сайт
              </label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
                leftIcon={<Globe className="h-4 w-4" />}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Telegram пост
              </label>
              <Input
                value={formData.telegramPost}
                onChange={(e) => setFormData(prev => ({ ...prev, telegramPost: e.target.value }))}
                placeholder="https://t.me/..."
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Баннер проекта (URL)
              </label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.png"
                leftIcon={<Image className="h-4 w-4" />}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </Card>

        {/* Translated Fields */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">
            Переводы ({SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name})
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название проекта *
              </label>
              <Input
                value={formData.translations[currentLang]?.name || ''}
                onChange={(e) => updateTranslation('name', e.target.value)}
                placeholder="Название проекта"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Краткое описание *
              </label>
              <Textarea
                value={formData.translations[currentLang]?.description || ''}
                onChange={(e) => updateTranslation('description', e.target.value)}
                placeholder="Краткое описание проекта"
                rows={3}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </Card>

        {/* Markdown Content */}
        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Содержание ({SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name})
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
                dangerouslySetInnerHTML={{ __html: renderMarkdown(currentContent || '*Введите содержание...*') }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={formData.translations[currentLang]?.content || ''}
                onChange={(e) => updateTranslation('content', e.target.value)}
                placeholder={`### Введение
Описание первого раздела...

### Установка
Шаги установки...

### Использование
Как использовать проект...`}
                rows={20}
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Поддерживается: ### заголовки (для навигации), **жирный**, *курсив*, `код`, списки (- или 1.), [ссылки](url), ![изображения](url)
              </p>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
