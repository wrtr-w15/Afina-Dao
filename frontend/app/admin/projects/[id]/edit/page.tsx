'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft, Save, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode, DEFAULT_LANGUAGE } from '@/config/languages';
import { getProjectById, updateProject } from '@/lib/projects';
import { getCategories } from '@/lib/categories';
import { Category } from '@/types/category';
import TranslatableBlockEditor, { TranslatableBlock } from '@/components/admin/TranslatableBlockEditor';
import { saveBlockTranslations } from '@/lib/block-translations';

interface ProjectTranslation {
  locale: string;
  name: string;
  description: string;
}

interface BlockTranslation {
  locale: string;
  title: string;
  content: string;
  gifCaption: string;
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
  
  const [formData, setFormData] = useState({
    sidebarName: '',
    status: 'draft' as 'active' | 'draft' | 'inactive',
    category: '',
    website: '',
    telegramPost: '',
    image: '',
    translations: {} as Record<LanguageCode, ProjectTranslation>,
    blocks: [] as TranslatableBlock[]
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
      
      setCategories(categoriesData);
      
      // Инициализируем переводы проекта для всех языков
      const translations: Record<LanguageCode, ProjectTranslation> = {} as any;
      SUPPORTED_LANGUAGES.forEach(lang => {
        const translation = project.translations?.find((t: any) => t.locale === lang.code);
        translations[lang.code] = {
          locale: lang.code,
          name: translation?.name || project.name || '',
          description: translation?.description || project.description || ''
        };
      });
      
      // Преобразуем блоки в формат с переводами
      const translatableBlocks: TranslatableBlock[] = (project.blocks || []).map((block: any) => {
        const blockTranslations: Record<LanguageCode, any> = {} as any;
        
        SUPPORTED_LANGUAGES.forEach(lang => {
          const blockTranslation = block.translations?.find((t: any) => t.locale === lang.code);
          blockTranslations[lang.code] = {
            locale: lang.code,
            title: blockTranslation?.title || block.title || '',
            content: blockTranslation?.content || block.content || '',
            gifCaption: blockTranslation?.gifCaption || block.gifCaption || ''
          };
        });
        
        return {
          id: block.id,
          gifUrl: block.gifUrl || '',
          links: block.links || [],
          translations: blockTranslations
        };
      });
      
      setFormData({
        sidebarName: project.sidebarName || '',
        status: project.status || 'draft',
        category: project.category || '',
        website: project.website || '',
        telegramPost: project.telegramPost || '',
        image: project.image || '',
        translations,
        blocks: translatableBlocks
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
      
      // Сохраняем основную информацию проекта и его переводы
      await updateProject(projectId, {
        sidebarName: formData.sidebarName,
        status: formData.status,
        category: formData.category,
        website: formData.website,
        telegramPost: formData.telegramPost,
        image: formData.image,
        translations: Object.values(formData.translations)
      });
      
      console.log('Project info saved, now saving block translations...');
      
      // Преобразуем блоки для API переводов
      const blocksForTranslationAPI = formData.blocks.map(block => ({
        id: block.id,
        gifUrl: block.gifUrl,
        links: block.links,
        translations: Object.values(block.translations).filter(t => t.locale) // Фильтруем пустые переводы
      }));
      
      console.log('Block translations to save:', blocksForTranslationAPI);
      
      // Сохраняем переводы блоков через отдельное API
      await saveBlockTranslations(projectId, blocksForTranslationAPI);
      
      console.log('✅ All saved successfully!');
      
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

  const updateTranslation = (field: 'name' | 'description', value: string) => {
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

  if (isLoading) {
    return (
      <AdminLayout title="Редактирование проекта">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Загрузка...</div>
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
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">Проект успешно сохранен!</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Language Selector */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
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
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Common Fields (no translation) */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Общие настройки (без перевода)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название в сайдбаре *
              </label>
              <Input
                value={formData.sidebarName}
                onChange={(e) => setFormData(prev => ({ ...prev, sidebarName: e.target.value }))}
                placeholder="Короткое название для сайдбара"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Статус *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="active">Активен</option>
                <option value="draft">Черновик</option>
                <option value="inactive">Не активен</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Категория *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Веб-сайт
              </label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telegram пост
              </label>
              <Input
                value={formData.telegramPost}
                onChange={(e) => setFormData(prev => ({ ...prev, telegramPost: e.target.value }))}
                placeholder="https://t.me/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Баннер проекта (URL)
              </label>
              <Input
                value={formData.image}
                onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.png"
              />
            </div>
          </div>
        </Card>

        {/* Translated Fields */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Переводы ({SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name})
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Название проекта *
              </label>
              <Input
                value={formData.translations[currentLang]?.name || ''}
                onChange={(e) => updateTranslation('name', e.target.value)}
                placeholder="Название проекта"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Описание *
              </label>
              <Textarea
                value={formData.translations[currentLang]?.description || ''}
                onChange={(e) => updateTranslation('description', e.target.value)}
                placeholder="Краткое описание проекта"
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Blocks with translations */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Блоки контента ({SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Заголовок, контент и подпись к изображению переводятся для каждого языка. 
            GIF/изображения и ссылки общие для всех языков.
          </p>
          <TranslatableBlockEditor
            blocks={formData.blocks}
            currentLang={currentLang}
            onChange={(blocks) => setFormData(prev => ({ ...prev, blocks }))}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}

