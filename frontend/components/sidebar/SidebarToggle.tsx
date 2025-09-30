import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  className?: string;
}

export function SidebarToggle({
  isCollapsed,
  onToggle,
  size = 'md',
  variant = 'default',
  className,
}: SidebarToggleProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-10 h-10 text-lg',
  };

  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
  };

  return (
    <button
      onClick={onToggle}
      className={clsx(
        'flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
        'hover:scale-105 active:scale-95',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <div className="transition-transform duration-300 ease-in-out">
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </div>
    </button>
  );
}

export default SidebarToggle;
