'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Layout from '@/components/LayoutComponent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft, 
  Globe,
  Calendar,
  Send
} from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, parseMarkdownSections, MarkdownSection } from '@/types/project';
import { getProjectById } from '@/lib/projects';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('project');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Get translated content
  const getTranslatedContent = () => {
    if (!project) return { name: '', description: '', content: '' };
    
    if (!project.translations || project.translations.length === 0) {
      return {
        name: project.name || '',
        description: project.description || '',
        content: project.content || ''
      };
    }
    
    const translation = project.translations.find((t: any) => t.locale === locale);
    
    if (translation) {
      return {
        name: translation.name || project.name || '',
        description: translation.description || project.description || '',
        content: translation.content || project.content || ''
      };
    }
    
    return {
      name: project.name || '',
      description: project.description || '',
      content: project.content || ''
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
        setProject(foundProject);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [params.id]);

  // Parse sections from content
  const translatedContent = getTranslatedContent();
  const sections: MarkdownSection[] = parseMarkdownSections(translatedContent.content);

  // Track active section on scroll
  useEffect(() => {
    if (sections.length === 0) return;

    const handleScroll = () => {
      if (isScrolling) return;

      const sectionElements = sections
        .map((_, index) => document.getElementById(`section-${index}`))
        .filter((el): el is HTMLElement => el !== null);

      if (sectionElements.length === 0) return;

      const scrollPosition = window.scrollY + 200;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const element = sectionElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(i);
          return;
        }
      }
      
      setActiveSection(0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections, isScrolling]);

  if (loading) {
    return (
      <Layout 
        title={`${t('loading')} - Afina DAO Wiki`}
        description={t('loading')}
        showSidebar={true}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">{t('loading')}</div>
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
          <h1 className="text-2xl font-bold text-white mb-4">
            Проект не найден
          </h1>
          <p className="text-gray-400 mb-6">
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

  // Scroll to section
  const scrollToSection = (index: number) => {
    setIsScrolling(true);
    setActiveSection(index);
    
    const element = document.getElementById(`section-${index}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      
      setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    } else {
      setIsScrolling(false);
    }
  };

  // Render Markdown content
  const renderMarkdown = (content: string) => {
    const html = content
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mb-6">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold text-white mt-8 mb-4">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 text-sm">$1</code>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 text-gray-300 mb-1">• $1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-gray-300 mb-1">$1</li>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-4 w-full object-cover" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p class="mb-4 text-gray-300">')
      .replace(/\n/g, '<br>');
    
    return DOMPurify.sanitize(`<p class="mb-4 text-gray-300">${html}</p>`, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'li', 'p', 'br', 'code', 'a', 'img'],
      ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt']
    });
  };

  return (
    <Layout 
      title={`${translatedContent.name} - Afina DAO Wiki`}
      description={translatedContent.description}
      showSidebar={true}
    >
      <div className="space-y-8">
        {/* Project Banner */}
        {project.image && (
          <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/20">
            <img 
              src={project.image} 
              alt={`Баннер ${translatedContent.name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-500">Изображение не загружено</div>';
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Header */}
        <div className="mb-8 max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {translatedContent.name}
          </h1>
          <div className="flex items-center gap-4 mb-4">
            <Badge className={PROJECT_STATUS_COLORS[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <div className="flex items-center text-sm text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              {t('created')}: {formatDate(project.createdAt)}
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-8 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="flex-1 max-w-4xl pr-8">
            <div className="space-y-8">
              {/* Description */}
              {translatedContent.description && (
                <div className="border-b border-white/10 pb-8">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {t('description')}
                  </h2>
                  <div className="text-lg text-gray-300 leading-relaxed">
                    {translatedContent.description}
                  </div>
                </div>
              )}
              
              {/* Markdown Sections */}
              {sections.length > 0 && (
                <div className="space-y-8">
                  {sections.map((section, index) => {
                    // Первый раздел не должен иметь верхнюю границу, если перед ним есть описание
                    const hasDescriptionBefore = translatedContent.description && index === 0;
                    return (
                      <div 
                        key={section.id} 
                        id={`section-${index}`} 
                        className="scroll-mt-20"
                      >
                        <h2 className={`text-2xl font-bold text-white mb-4 pt-4 ${hasDescriptionBefore ? '' : 'border-t border-white/10'}`}>
                          {section.title}
                        </h2>
                      
                      {section.content && (
                        <div 
                          className="prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: renderMarkdown(section.content) 
                          }}
                        />
                      )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* If no sections, show raw content */}
              {sections.length === 0 && translatedContent.content && (
                <div 
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(translatedContent.content) 
                  }}
                />
              )}
            </div>
          </div>

          {/* Сайдбар: навигация по разделам, при скролле прилипает к верху */}
          {!isMobile && sections.length > 0 && (
            <div className="flex-shrink-0 w-64 min-w-0 ml-6">
              <div className="sticky top-4 z-20 self-start">
                <nav
                  className="w-56 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-3 px-3 shadow-lg"
                  aria-label="Навигация по разделам"
                >
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(index)}
                      className={`w-full text-left py-2 px-3 rounded-lg flex items-center gap-2 text-sm transition-colors duration-150 leading-snug ${
                        activeSection === index
                          ? 'text-white bg-white/10'
                          : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
                      }`}
                      title={section.title}
                    >
                      <span className="break-words">{section.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* Project Links */}
        {(project.website || project.telegramPost) && (
          <div className="border-t border-white/10 pt-8 max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">
              {t('projectLinks')}
            </h2>
            
            <div className="flex flex-wrap gap-4">
              {project.website && (
                <a
                  href={project.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
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
                  className="inline-flex items-center justify-center w-12 h-12 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
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
