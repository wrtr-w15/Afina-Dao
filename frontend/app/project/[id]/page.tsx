'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/LayoutComponent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft, 
  Globe,
  Link as LinkIcon,
  Calendar,
  Send
} from 'lucide-react';
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project';
import { getProjectById } from '@/lib/projects';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBlock, setActiveBlock] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsCompact(width < 1024 && width >= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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

  // Отслеживание активного блока при прокрутке
  useEffect(() => {
    if (!project?.blocks) return;

    const handleScroll = () => {
      const blocks = project.blocks.map((_, index) => 
        document.getElementById(`block-${index}`)
      ).filter(Boolean);

      const scrollPosition = window.scrollY + 100;

      for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i];
        if (block && block.offsetTop <= scrollPosition) {
          setActiveBlock(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [project]);

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

  // Функция для плавной прокрутки к блоку
  const scrollToBlock = (index: number) => {
    const element = document.getElementById(`block-${index}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      setActiveBlock(index);
    }
  };

  // Функция для рендеринга Markdown (простая версия)
  const renderMarkdown = (content: string) => {
    return content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
  };

  return (
    <Layout 
      title={`${project.name} - Afina DAO Wiki`}
      description={project.description}
      showSidebar={true}
    >
      <div className="space-y-8">
        {/* Банер проекта - на всю ширину */}
        {project.image && (
          <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden">
            <img 
              src={project.image} 
              alt={`Баннер ${project.name}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Заголовок - центрированный */}
        <div className="mb-8 max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {project.name}
          </h1>
          <div className="flex items-center gap-4 mb-4">
            <Badge className={PROJECT_STATUS_COLORS[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              Создан: {formatDate(project.createdAt)}
            </div>
          </div>
        </div>

        {/* Основной контент с сайдбаром - центрированный */}
        <div className="flex gap-8 max-w-7xl mx-auto">
          {/* Основной контент - центрированный */}
          <div className="flex-1 max-w-4xl pr-8">
            <div className="space-y-8">
              {/* Описание проекта */}
              {project.description && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Описание
                  </h2>
                  <div className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {project.description}
                  </div>
                </div>
              )}
              
              {/* Блоки проекта */}
              {project.blocks && project.blocks.length > 0 && (
                <div className="space-y-8">
                {project.blocks.map((block, index) => (
                  <div key={block.id} id={`block-${index}`} className="space-y-4 scroll-mt-20">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {block.title}
                    </h2>
                    
                    {block.content && (
                      <div 
                        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ 
                          __html: `<p class="mb-4">${renderMarkdown(block.content)}</p>` 
                        }}
                      />
                    )}
                    
                    {block.gifUrl && (
                      <div className="space-y-3">
                        <img 
                          src={block.gifUrl} 
                          alt={`GIF для ${block.title}`}
                          className="w-full max-w-4xl rounded-lg"
                        />
                        {block.gifCaption && (
                          <div className="text-center">
                            <p className="text-base text-gray-600 dark:text-gray-300 italic font-medium bg-gray-50 dark:bg-gray-800 py-2 px-4 rounded-lg">
                              {block.gifCaption}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {block.links && block.links.length > 0 && (
                      <div className="space-y-2">
                        {block.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          >
                            <LinkIcon className="h-4 w-4" />
                            {link.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>

          {/* Правый сайдбар - скрывается на мобильных устройствах */}
          {!isMobile && (
            <div className={`flex-shrink-0 ${isCompact ? 'w-48' : 'w-80'}`}>
              <div className="sticky top-24 space-y-4">
                {project.blocks && project.blocks.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 shadow-lg p-2 rounded-lg">
                    <nav className="px-1 pb-1 space-y-0.5">
                      {project.blocks.map((block, index) => (
                        <button
                          key={block.id}
                          onClick={() => scrollToBlock(index)}
                          className={`w-full text-left px-2 py-2.5 ${isCompact ? 'text-xs' : 'text-xs'} rounded transition-colors ${
                            activeBlock === index
                              ? 'text-blue-600 dark:text-blue-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={isCompact ? block.title : undefined}
                        >
                          {isCompact ? (
                            <span className="truncate block">
                              {block.title.length > 20 ? block.title.substring(0, 20) + '...' : block.title}
                            </span>
                          ) : (
                            block.title
                          )}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ссылки проекта - центрированные */}
        {(project.website || project.telegramPost) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Ссылки проекта
            </h2>
            
            <div className="flex flex-wrap gap-4">
              {project.website && (
                <a
                  href={project.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Веб-сайт"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
              
              {project.telegramPost && (
                <a
                  href={project.telegramPost}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Telegram Post"
                >
                  <Send className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}