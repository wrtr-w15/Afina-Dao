import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { api } from '@/lib/api';
import { useCategories } from '@/hooks/useCategories';

interface ArticleFormData {
  slug: string;
  isPublished: boolean;
  categoryId: number;
  translations: Array<{
    language: string;
    title: string;
    content: string;
    excerpt?: string;
    metaDescription?: string;
  }>;
}

export default function ArticleForm() {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ArticleFormData>({
    defaultValues: {
      isPublished: true,
      translations: [{ language: 'en', title: '', content: '', excerpt: '', metaDescription: '' }],
    },
  });

  const createArticleMutation = useMutation(
    async (data: ArticleFormData) => {
      const response = await api.post('/articles', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['articles']);
        alert('Article created successfully!');
      },
    }
  );

  const onSubmit = (data: ArticleFormData) => {
    createArticleMutation.mutate(data);
  };

  const addLanguage = (language: string) => {
    if (!selectedLanguages.includes(language)) {
      setSelectedLanguages([...selectedLanguages, language]);
      setValue('translations', [
        ...watch('translations'),
        { language, title: '', content: '', excerpt: '', metaDescription: '' }
      ]);
    }
  };

  const removeLanguage = (language: string) => {
    if (selectedLanguages.length > 1) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== language));
      setValue('translations', watch('translations').filter(t => t.language !== language));
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('createArticle')}</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('slug')}
            </label>
            <input
              {...register('slug', { required: 'Slug is required' })}
              className="input"
              placeholder="article-slug"
            />
            {errors.slug && (
              <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('category')}
            </label>
            <select
              {...register('categoryId', { required: 'Category is required' })}
              className="input"
            >
              <option value="">Select category</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('language')}
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => 
                  selectedLanguages.includes(lang.code) 
                    ? removeLanguage(lang.code)
                    : addLanguage(lang.code)
                }
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedLanguages.includes(lang.code)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {selectedLanguages.map((lang, index) => (
          <div key={lang} className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">
              {languages.find(l => l.code === lang)?.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('title')}
                </label>
                <input
                  {...register(`translations.${index}.title`, { required: 'Title is required' })}
                  className="input"
                  placeholder="Article title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('excerpt')}
                </label>
                <textarea
                  {...register(`translations.${index}.excerpt`)}
                  className="input"
                  rows={3}
                  placeholder="Article excerpt"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('content')}
                </label>
                <textarea
                  {...register(`translations.${index}.content`, { required: 'Content is required' })}
                  className="input"
                  rows={10}
                  placeholder="Article content (Markdown supported)"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              {...register('isPublished')}
              type="checkbox"
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">{t('published')}</span>
          </label>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="btn-secondary"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={createArticleMutation.isLoading}
            className="btn-primary"
          >
            {createArticleMutation.isLoading ? 'Creating...' : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
