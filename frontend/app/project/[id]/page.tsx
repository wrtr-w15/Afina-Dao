'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
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
import DOMPurify from 'isomorphic-dompurify';
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project';
import { getProjectById } from '@/lib/projects';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBlock, setActiveBlock] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Отслеживание изменения activeBlock для отладки
  useEffect(() => {
    console.log(`📍 Active block changed to: ${activeBlock}`);
  }, [activeBlock]);

  // Функция для получения переведенного контента проекта
  const getTranslatedProjectContent = () => {
    if (!project) return { name: '', description: '' };
    
    // Если нет переводов вообще, используем базовые значения
    if (!project.translations || project.translations.length === 0) {
      return {
        name: project.name || '',
        description: project.description || ''
      };
    }
    
    // Ищем перевод для текущего языка
    const translation = project.translations.find((t: any) => t.locale === locale);
    
    // Если перевод найден, используем его (с fallback на базовые значения)
    if (translation) {
      return {
        name: translation.name || project.name || '',
        description: translation.description || project.description || ''
      };
    }
    
    // Если перевода нет, используем базовые значения
    return {
      name: project.name || '',
      description: project.description || ''
    };
  };

  // Функция для получения переведенного контента блока
  const getTranslatedBlockContent = (block: any) => {
    console.log(`Getting translation for block ${block.id}, locale: ${locale}`, {
      hasTranslations: !!block.translations,
      translationsCount: block.translations?.length || 0,
      availableLocales: block.translations?.map((t: any) => t.locale) || [],
      currentLocale: locale
    });
    
    // Если нет переводов вообще, используем базовые значения
    if (!block.translations || block.translations.length === 0) {
      console.log(`→ Using base values for block ${block.id}`);
      return {
        title: block.title || '',
        content: block.content || '',
        gifCaption: block.gifCaption || ''
      };
    }
    
    // Ищем перевод для текущего языка
    const translation = block.translations.find((t: any) => t.locale === locale);
    
    // Если перевод найден, используем его
    if (translation) {
      console.log(`→ Found translation for block ${block.id}, locale ${locale}:`, {
        title: translation.title,
        contentLength: translation.content?.length || 0
      });
      return {
        title: translation.title || block.title || '',
        content: translation.content || block.content || '',
        gifCaption: translation.gifCaption || block.gifCaption || ''
      };
    }
    
    // Если перевода нет, используем базовые значения
    console.log(`→ No translation found for block ${block.id}, locale ${locale}, using base values`);
    return {
      title: block.title || '',
      content: block.content || '',
      gifCaption: block.gifCaption || ''
    };
  };

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
        
        console.log('Project loaded:', {
          id: foundProject?.id,
          name: foundProject?.name,
          translationsCount: foundProject?.translations?.length || 0,
          translations: foundProject?.translations,
          blocksCount: foundProject?.blocks?.length || 0,
          blocks: foundProject?.blocks?.map((b: any) => ({
            id: b.id,
            title: b.title,
            translationsCount: b.translations?.length || 0
          }))
        });
        
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
    if (!project?.blocks || project.blocks.length === 0) return;

    const handleScroll = () => {
      // Игнорируем события скролла во время программной прокрутки
      if (isScrolling) {
        console.log('Skipping scroll handler - programmatic scroll in progress');
        return;
      }

      const blocks = project.blocks
        .map((_, index) => document.getElementById(`block-${index}`))
        .filter((el): el is HTMLElement => el !== null);

      if (blocks.length === 0) {
        console.log('No blocks found in DOM');
        return;
      }

      const scrollPosition = window.scrollY + 200;

      console.log('Scroll check:', {
        scrollY: window.scrollY,
        scrollPosition,
        blocksCount: blocks.length,
        blockPositions: blocks.map((b, i) => ({ index: i, offsetTop: b.offsetTop }))
      });

      // Проходим блоки от последнего к первому
      for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i];
        if (block && block.offsetTop <= scrollPosition) {
          console.log(`→ Setting active block: ${i}`);
          setActiveBlock(i);
          return;
        }
      }
      
      // Если ни один блок не прошёл проверку, ставим первый активным
      console.log('→ Setting active block: 0 (default)');
      setActiveBlock(0);
    };

    // Вызываем сразу при монтировании
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [project, locale, isScrolling]); // Добавили isScrolling в зависимости

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
    console.log(`🎯 Manual scroll to block ${index}`);
    console.log(`   Current activeBlock: ${activeBlock}`);
    
    // Устанавливаем флаг программной прокрутки
    setIsScrolling(true);
    console.log(`   isScrolling set to: true`);
    
    // Сразу устанавливаем активный блок
    setActiveBlock(index);
    console.log(`   activeBlock set to: ${index}`);
    
    const element = document.getElementById(`block-${index}`);
    if (element) {
      console.log(`   ✓ Element found: block-${index}`);
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      console.log(`   ✓ scrollIntoView called`);
      
      // Сбрасываем флаг через 1 секунду (время плавной прокрутки)
      setTimeout(() => {
        console.log('✓ Programmatic scroll completed, re-enabling scroll handler');
        setIsScrolling(false);
      }, 1000);
    } else {
      console.error(`   ✗ Element NOT found: block-${index}`);
      // Если элемент не найден, сразу сбрасываем флаг
      setIsScrolling(false);
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
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
    
    // Санитизация HTML для предотвращения XSS
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'li', 'p', 'br'],
      ALLOWED_ATTR: ['class'],
      ALLOW_DATA_ATTR: false
    });
  };

  const translatedProject = getTranslatedProjectContent();

  return (
    <Layout 
      title={`${translatedProject.name} - Afina DAO Wiki`}
      description={translatedProject.description}
      showSidebar={true}
    >
      <div className="space-y-8">
        {/* Банер проекта - на всю ширину */}
        {project.image && (
          <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden">
            <img 
              src={project.image} 
              alt={`Баннер ${translatedProject.name}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Заголовок - центрированный */}
        <div className="mb-8 max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {translatedProject.name}
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
              {translatedProject.description && (
                <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Описание
                  </h2>
                  <div className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {translatedProject.description}
                  </div>
                </div>
              )}
              
              {/* Блоки проекта */}
              {project.blocks && project.blocks.length > 0 && (
                <div className="space-y-8">
                {project.blocks.map((block, index) => {
                  const translatedBlock = getTranslatedBlockContent(block);
                  return (
                  <div key={block.id} id={`block-${index}`} className="space-y-4 scroll-mt-20">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {translatedBlock.title}
                    </h2>
                    
                    {translatedBlock.content && (
                      <div 
                        className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ 
                          __html: `<p class="mb-4">${renderMarkdown(translatedBlock.content)}</p>` 
                        }}
                      />
                    )}
                    
                    {block.gifUrl && (
                      <div className="space-y-3">
                        <img 
                          src={block.gifUrl} 
                          alt={`GIF для ${translatedBlock.title}`}
                          className="w-full max-w-4xl rounded-lg"
                        />
                        {translatedBlock.gifCaption && (
                          <div className="text-center">
                            <p className="text-base text-gray-600 dark:text-gray-300 italic font-medium bg-gray-50 dark:bg-gray-800 py-2 px-4 rounded-lg">
                              {translatedBlock.gifCaption}
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
                )})}
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
                      {project.blocks.map((block, index) => {
                        const translatedBlock = getTranslatedBlockContent(block);
                        const blockTitle = translatedBlock.title;
                        return (
                        <button
                          key={block.id}
                          onClick={() => scrollToBlock(index)}
                          className={`w-full text-left px-2 py-2.5 ${isCompact ? 'text-xs' : 'text-xs'} rounded transition-colors ${
                            activeBlock === index
                              ? 'text-blue-600 dark:text-blue-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={isCompact ? blockTitle : undefined}
                        >
                          {isCompact ? (
                            <span className="truncate block">
                              {blockTitle.length > 20 ? blockTitle.substring(0, 20) + '...' : blockTitle}
                            </span>
                          ) : (
                            blockTitle
                          )}
                        </button>
                      )})}
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