'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '../../../components/Layout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { 
  ArrowLeft, 
  ExternalLink, 
  Github, 
  Calendar, 
  Users, 
  Code,
  Monitor,
  Smartphone,
  Globe,
  FileText,
  Link as LinkIcon,
  Image
} from 'lucide-react';
import { Project, PROJECT_STATUS_LABELS, PROJECT_CATEGORY_LABELS, PROJECT_STATUS_COLORS, PROJECT_CATEGORY_COLORS, OS_COMPATIBILITY_LABELS, OS_COMPATIBILITY_ICONS } from '../../../types/project';
import { getProjectById } from '../../../lib/projects';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectId = params.id as string;
        const foundProject = await getProjectById(projectId);
        setProject(foundProject);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [params.id]);

  if (loading) {
    return (
      <Layout 
        title="Загрузка проекта - Afina DAO Wiki"
        description="Загрузка информации о проекте"
        showSidebar={true}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout 
        title="Проект не найден - Afina DAO Wiki"
        description="Проект не найден"
        showSidebar={true}
      >
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Проект не найден
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Запрашиваемый проект не существует или был удален
          </p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Вернуться на главную
          </Button>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getOSIcon = (os: string) => {
    switch (os) {
      case 'windows': return <Monitor className="h-4 w-4" />;
      case 'macos': return <Monitor className="h-4 w-4" />;
      case 'linux': return <Monitor className="h-4 w-4" />;
      case 'web': return <Globe className="h-4 w-4" />;
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Layout 
      title={`${project.name} - Afina DAO Wiki`}
      description={project.description}
      showSidebar={true}
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {project.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {project.description}
            </p>
          </div>
        </div>

        {/* Status and Category */}
        <div className="flex flex-wrap gap-3">
          <Badge className={PROJECT_STATUS_COLORS[project.status]}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
          <Badge className={PROJECT_CATEGORY_COLORS[project.category]}>
            {PROJECT_CATEGORY_LABELS[project.category]}
          </Badge>
        </div>

        {/* Progress */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Прогресс проекта
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Выполнено</span>
              <span>{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Основная информация */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Основная информация
            </h2>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span>Создан: {formatDate(project.createdAt)}</span>
              </div>
            </div>
          </Card>

        </div>

        {/* Совместимость ОС */}
        {project.compatibility && project.compatibility.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Совместимость
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {project.compatibility.map((os, index) => (
                <div 
                  key={index}
                  className="flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg"
                >
                  {getOSIcon(os)}
                  <span className="ml-2 text-sm font-medium">
                    {OS_COMPATIBILITY_LABELS[os]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Блоки описания */}
        {project.blocks && project.blocks.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Описание проекта
            </h2>
            
            {project.blocks.map((block, index) => (
              <Card key={block.id} className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {block.title}
                </h3>
                
                {block.content && (
                  <div className="prose dark:prose-invert max-w-none mb-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {block.content}
                    </pre>
                  </div>
                )}
                
                {block.gifUrl && (
                  <div className="mb-4">
                    <img 
                      src={block.gifUrl} 
                      alt={`GIF для ${block.title}`}
                      className="max-w-full h-auto rounded-lg"
                    />
                  </div>
                )}
                
                {block.links && block.links.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Ссылки:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {block.links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {link.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Ссылки проекта */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Ссылки проекта
          </h2>
          
          <div className="flex flex-wrap gap-3">
            {project.website && (
              <a
                href={project.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Веб-сайт
              </a>
            )}
            
            {project.telegramPost && (
              <a
                href={project.telegramPost}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Globe className="h-4 w-4 mr-2" />
                Telegram Post
              </a>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
