import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Calendar, Eye, Heart, User, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ru, es, fr, de } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const locales = { en: enUS, ru, es, fr, de };

interface Article {
  id: number;
  slug: string;
  views: number;
  likes: number;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
  category: {
    name: string;
    slug: string;
  };
  translations: Array<{
    language: string;
    title: string;
    content: string;
    excerpt: string;
  }>;
}

interface ArticleContentProps {
  article: Article;
  onLike: () => void;
}

export default function ArticleContent({ article, onLike }: ArticleContentProps) {
  const { t } = useTranslation('common');
  const [isLiked, setIsLiked] = useState(false);
  
  const translation = article.translations[0]; // Get the current language translation
  
  const formatDate = (date: string) => {
    const locale = locales[translation.language as keyof typeof locales] || enUS;
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale });
  };

  const handleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      onLike();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: translation.title,
          text: translation.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert(t('linkCopied'));
    }
  };

  return (
    <article className="max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
            {article.category.name}
          </span>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(article.createdAt)}</span>
            </div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {translation.title}
        </h1>
        
        {translation.excerpt && (
          <p className="text-xl text-gray-600 mb-6">
            {translation.excerpt}
          </p>
        )}
        
        <div className="flex items-center justify-between py-4 border-t border-b border-gray-200">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">
                {article.author.firstName} {article.author.lastName}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{article.views}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              disabled={isLiked}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                isLiked
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{article.likes + (isLiked ? 1 : 0)}</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>{t('share')}</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-6">{children}</h3>,
            p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-gray-700">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600 my-4">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                {children}
              </pre>
            ),
          }}
        >
          {translation.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
