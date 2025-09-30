'use client';

import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

interface Category {
  id: number;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
}

interface CategoryCardProps {
  category: Category;
  onClick: () => void;
  isSelected?: boolean;
}

export default function CategoryCard({ category, onClick, isSelected = false }: CategoryCardProps) {
  const router = useRouter();

  const handleClick = () => {
    onClick();
  };

  const handleViewAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/category/${category.slug}`);
  };

  return (
    <div 
      className={`card cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-primary-500 bg-primary-50' 
          : 'hover:shadow-md hover:border-primary-300'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {category.icon ? (
            <span className="text-2xl">{category.icon}</span>
          ) : (
            <BookOpen className="h-8 w-8 text-primary-600" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {category.name}
          </h3>
          
          {category.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {category.description}
            </p>
          )}
          
          <button
            onClick={handleViewAll}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all articles →
          </button>
        </div>
      </div>
    </div>
  );
}
