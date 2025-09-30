'use client';

import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { SidebarToggle } from './SidebarToggle';
// import { useTheme } from '@/styles/themes/theme-provider';

// Types
interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  children?: SidebarItem[];
  disabled?: boolean;
  active?: boolean;
}

interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

interface SidebarProps {
  children?: ReactNode;
  className?: string;
  width?: number;
  collapsedWidth?: number;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  sections?: SidebarSection[];
  onItemClick?: (item: SidebarItem) => void;
  activeItemId?: string;
  showToggle?: boolean;
  position?: 'fixed' | 'static';
  variant?: 'default' | 'compact' | 'minimal';
}

// Sidebar Builder Class
export class SidebarBuilder {
  private sections: SidebarSection[] = [];
  private config: Partial<SidebarProps> = {};

  constructor() {
    this.config = {
      width: 256,
      collapsedWidth: 64,
      showToggle: true,
      position: 'fixed',
      variant: 'default',
    };
  }

  // Configuration methods
  width(width: number) {
    this.config.width = width;
    return this;
  }

  collapsedWidth(width: number) {
    this.config.collapsedWidth = width;
    return this;
  }

  position(position: 'fixed' | 'static') {
    this.config.position = position;
    return this;
  }

  variant(variant: 'default' | 'compact' | 'minimal') {
    this.config.variant = variant;
    return this;
  }

  showToggle(show: boolean) {
    this.config.showToggle = show;
    return this;
  }

  // Section methods
  addSection(section: SidebarSection) {
    this.sections.push(section);
    return this;
  }

  addItem(sectionId: string, item: SidebarItem) {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.items.push(item);
    }
    return this;
  }

  addItems(sectionId: string, items: SidebarItem[]) {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.items.push(...items);
    }
    return this;
  }

  // Quick section creators
  addNavigationSection(items: SidebarItem[]) {
    this.addSection({
      id: 'navigation',
      items,
    });
    return this;
  }

  addCategoriesSection(items: SidebarItem[]) {
    this.addSection({
      id: 'categories',
      title: 'Categories',
      items,
      collapsible: true,
      defaultCollapsed: false,
    });
    return this;
  }

  addSettingsSection(items: SidebarItem[]) {
    this.addSection({
      id: 'settings',
      title: 'Settings',
      items,
      collapsible: true,
      defaultCollapsed: true,
    });
    return this;
  }

  // Build method
  build() {
    return {
      sections: this.sections,
      config: this.config,
    };
  }
}

// Main Sidebar Component
export function Sidebar({
  children,
  className,
  width = 256,
  collapsedWidth = 64,
  collapsed: controlledCollapsed,
  onCollapseChange,
  sections = [],
  onItemClick,
  activeItemId,
  showToggle = true,
  position = 'fixed',
  variant = 'default',
}: SidebarProps) {
  // const { currentTheme } = useTheme();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle collapse toggle
  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapseChange?.(newCollapsed);
  };

  // Handle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Handle item click
  const handleItemClick = (item: SidebarItem) => {
    if (item.disabled) return;
    
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      // Handle navigation
      window.location.href = item.href;
    }
    
    onItemClick?.(item);
  };

  // Render item
  const renderItem = (item: SidebarItem, level = 0) => {
    const isActive = activeItemId === item.id || item.active;
    const hasChildren = item.children && item.children.length > 0;
    const isItemCollapsed = isCollapsed && level === 0;

    return (
      <div key={item.id} className="relative">
        <button
          onClick={() => handleItemClick(item)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          disabled={item.disabled}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            {
              // Active state - синяя подсветка
              'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300': isActive,
              // Hover state
              'hover:bg-gray-100 dark:hover:bg-gray-700': !isActive && !item.disabled,
              // Disabled state
              'opacity-50 cursor-not-allowed': item.disabled,
              // Collapsed state
              'justify-center px-2': isItemCollapsed,
              // Level indentation
              'ml-4': level > 0 && !isCollapsed,
            }
          )}
        >
          {/* Иконка слева */}
          {item.icon && (
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {item.icon}
            </div>
          )}
          
          {/* Текст справа (только если не свернут) */}
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate font-medium text-sm">
                {item.label}
              </span>
              
              {/* Бейдж справа */}
              {item.badge && (
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                >
                  {item.badge}
                </span>
              )}
            </>
          )}
        </button>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children?.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render section
  const renderSection = (section: SidebarSection, index: number) => {
    const isSectionCollapsed = collapsedSections.has(section.id);
    const shouldShowToggle = section.collapsible && !isCollapsed;
    const isFirstSection = index === 0;

    return (
      <div key={section.id} className="mb-6">
        {section.title && !isCollapsed && (
          <div className="flex items-center justify-between mb-3">
            <h3 
              className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              {section.title}
            </h3>
            
            <div className="flex items-center gap-2">
              {/* Кнопка сворачивания секции */}
              {shouldShowToggle && (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {isSectionCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {(!section.collapsible || !isSectionCollapsed) && (
          <div className="space-y-1">
            {section.items.map(item => renderItem(item))}
          </div>
        )}
      </div>
    );
  };

  const sidebarWidth = isCollapsed ? collapsedWidth : width;

  // Don't render on server side to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className={clsx(
        'flex flex-col transition-all duration-300 ease-in-out bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-md',
        {
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)]': position === 'fixed',
          'static h-full': position === 'static',
        },
        className
      )}
      style={{ 
        width: sidebarWidth,
        transition: 'width 300ms ease-in-out'
      }}
    >
      {/* Header - убрали верхнюю надпись Navigation */}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children || sections.map((section, index) => renderSection(section, index))}
      </div>

      {/* Footer - с плавными анимациями */}
      <div className="p-4 transition-all duration-300 ease-in-out">
        <div className="flex items-center justify-between">
          {/* Powered By Afina - с плавной анимацией */}
          <div className={clsx(
            'transition-all duration-300 ease-in-out overflow-hidden',
            isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          )}>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              <span>Powered By</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Afina</span>
            </div>
          </div>
          
          {/* Sidebar Toggle Button - справа */}
          {showToggle && (
            <div className="transition-all duration-300 ease-in-out">
              <SidebarToggle
                isCollapsed={isCollapsed}
                onToggle={handleToggle}
                size="md"
                variant="default"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
