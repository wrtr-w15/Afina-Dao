'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Layout from '@/components/LayoutComponent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft, 
  ExternalLink, 
  Globe,
  Link as LinkIcon,
  Image,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Menu,
  Send,
  List,
  Navigation,
  AlignJustify
} from 'lucide-react';
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project';
import { getProjectById } from '@/lib/projects';
import DOMPurify from 'isomorphic-dompurify';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('project');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBlock, setActiveBlock] = useState<number>(0);
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);

  // Get translated project name
  const getTranslatedName = () => {
    if (!project) return '';
    const translation = project.translations?.find((t: any) => t.locale === locale);
    return translation?.name || project.name || '';
  };

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
        title={`${t('notFound')} - Afina DAO Wiki`}
        description={t('notFound')}
        showSidebar={true}
      >
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('notFound')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('notFoundDesc')}
          </p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToHome')}
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
  // Безопасный рендеринг Markdown с санитизацией HTML
  const renderMarkdown = (content: string) => {
    const html = content
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 text-sm">$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-4 w-full object-cover" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
    
    // Санитизация HTML для предотвращения XSS
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'li', 'p', 'br', 'code', 'a', 'img'],
      ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt'],
      ALLOW_DATA_ATTR: false
    });
  };

  return (
    <Layout 
      title={`${getTranslatedName()} - Afina DAO Wiki`}
      description={project.description}
      showSidebar={true}
    >
      <div className="space-y-8">
        {/* Банер проекта */}
        {project.image && (
          <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/20">
            <img 
              src={project.image} 
              alt={`Баннер ${project.name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Изображение не загружено</div>';
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {getTranslatedName()}
          </h1>
          <div className="flex items-center gap-4 mb-4">
            <Badge className={PROJECT_STATUS_COLORS[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              {t('created')}: {formatDate(project.createdAt)}
            </div>
          </div>
        </div>

        {/* Основной контент с сайдбаром */}
        <div className="flex gap-8">
          {/* Основной контент */}
          <div className="flex-1">
            {/* Блоки описания без границ */}
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

          {/* Правый сайдбар */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Компактная навигация */}
              {project.blocks && project.blocks.length > 0 && (
                <div className={`rounded-lg transition-all duration-200 ${
                  isNavigationCollapsed 
                    ? 'p-1' 
                    : 'bg-white dark:bg-gray-800 shadow-lg p-2'
                }`}>
                  {/* Содержимое навигации */}
                  {!isNavigationCollapsed && (
                    <nav className="px-1 pb-1 space-y-0.5">
                      {project.blocks.map((block, index) => (
                        <div key={block.id} className="flex items-center justify-between">
                          <button
                            onClick={() => scrollToBlock(index)}
                            className={`flex-1 text-left px-2 py-2.5 text-xs rounded transition-colors ${
                              activeBlock === index
                                ? 'text-blue-600 dark:text-blue-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {block.title}
                          </button>
                          {index === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsNavigationCollapsed(!isNavigationCollapsed)}
                              className="ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all duration-200 p-0 h-10 w-10"
                              title="Свернуть навигацию"
                            >
                              <ChevronLeft className="h-10 w-10" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </nav>
                  )}
                  
                  {/* Кнопка разворачивания когда свернуто - на том же месте */}
                  {isNavigationCollapsed && (
                    <nav className="px-1 pb-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1"></div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsNavigationCollapsed(false)}
                          className="ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-500 transition-all duration-200 p-0 h-10 w-10"
                          title="Развернуть навигацию"
                        >
                          <List className="h-10 w-10" />
                        </Button>
                      </div>
                    </nav>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Ссылки проекта */}
        {(project.website || project.telegramPost) && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('projectLinks')}
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
