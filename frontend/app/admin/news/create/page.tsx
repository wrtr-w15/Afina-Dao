'use client';

import React from 'react';
import Layout from '../../../../components/Layout';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Select } from '../../../../components/ui/Select';
import { Badge } from '../../../../components/ui/Badge';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Upload, 
  Tag,
  Calendar,
  User,
  Globe,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

export default function CreateNews() {
  return (
    <Layout 
      title="Создать новость - Admin"
      description="Создание новой новости"
      showSidebar={true}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Создать новость
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Добавьте новую новость для вашего сообщества
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Предпросмотр
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Основная информация
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Заголовок *
                  </label>
                  <Input
                    placeholder="Введите заголовок новости"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Краткое описание
                  </label>
                  <Textarea
                    placeholder="Краткое описание новости"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Содержание *
                  </label>
                  <Textarea
                    placeholder="Полное содержание новости"
                    rows={10}
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Media */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Медиа
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Изображение
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Загрузить изображение
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      PNG, JPG, GIF до 10MB
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Настройки публикации
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Статус
                  </label>
                  <Select
                    options={[
                      { value: 'draft', label: 'Черновик' },
                      { value: 'published', label: 'Опубликовано' },
                      { value: 'archived', label: 'Архив' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Категория
                  </label>
                  <Select
                    options={[
                      { value: '', label: 'Выберите категорию' },
                      { value: 'announcement', label: 'Объявления' },
                      { value: 'update', label: 'Обновления' },
                      { value: 'partnership', label: 'Партнерства' },
                      { value: 'community', label: 'Сообщество' },
                      { value: 'technical', label: 'Технические' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Дата публикации
                  </label>
                  <Input
                    type="datetime-local"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Автор
                  </label>
                  <Input
                    value="Admin"
                    disabled
                  />
                </div>
              </div>
            </Card>

            {/* Tags */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Теги
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Теги
                  </label>
                  <Input
                    placeholder="Введите теги через запятую"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Например: DeFi, NFT, Blockchain
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featured"
                    className="rounded"
                  />
                  <label htmlFor="featured" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Рекомендуемая новость
                  </label>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Статистика
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Символов:</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Слов:</span>
                  <span className="text-sm font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Время чтения:</span>
                  <span className="text-sm font-medium">~0 мин</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
