'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Eye, Heart, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ru, es, fr, de } from 'date-fns/locale';

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
    excerpt: string;
  }>;
}

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const router = useRouter();
  const locale = 'ru'; // Временное решение для App Router
  
  const translation = article.translations.find(t => t.language === locale) || article.translations[0];
  
  const handleClick = () => {
    router.push(`/article/${article.slug}`);
  };

  const formatDate = (date: string) => {
    const localeObj = locales[locale as keyof typeof locales] || enUS;
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: localeObj });
  };

  return (
    <div 
      className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            {article.category.name}
          </span>
          <span className="text-sm text-gray-500">
            {formatDate(article.createdAt)}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {translation.title}
        </h3>
        
        {translation.excerpt && (
          <p className="text-gray-600 text-sm line-clamp-3">
            {translation.excerpt}
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>{article.author.firstName} {article.author.lastName}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4" />
            <span>{article.views}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Heart className="h-4 w-4" />
            <span>{article.likes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
