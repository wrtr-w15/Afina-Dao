import { useState, useCallback, useRef, useEffect } from 'react';
import { SidebarBuilder } from '@/components/ui/Sidebar';

interface UseSidebarOptions {
  defaultCollapsed?: boolean;
  width?: number;
  collapsedWidth?: number;
  position?: 'fixed' | 'static';
  variant?: 'default' | 'compact' | 'minimal';
  persistState?: boolean;
  storageKey?: string;
}

interface UseSidebarReturn {
  // State
  collapsed: boolean;
  activeItemId: string | null;
  hoveredItemId: string | null;
  
  // Actions
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setActiveItem: (itemId: string | null) => void;
  setHoveredItem: (itemId: string | null) => void;
  
  // Builder
  builder: SidebarBuilder;
  
  // Config
  config: {
    width: number;
    collapsedWidth: number;
    position: 'fixed' | 'static';
    variant: 'default' | 'compact' | 'minimal';
  };
}

export function useSidebar(options: UseSidebarOptions = {}): UseSidebarReturn {
  const {
    defaultCollapsed = false,
    width = 256,
    collapsedWidth = 64,
    position = 'fixed',
    variant = 'default',
    persistState = true,
    storageKey = 'sidebar-collapsed',
  } = options;

  // State
  const [collapsed, setCollapsed] = useState(() => {
    if (persistState && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultCollapsed;
    }
    return defaultCollapsed;
  });

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  
  // Builder instance
  const builder = useRef(new SidebarBuilder()).current;
  
  // Configure builder
  builder
    .width(width)
    .collapsedWidth(collapsedWidth)
    .position(position)
    .variant(variant);

  // Persist state changes
  useEffect(() => {
    if (persistState && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(collapsed));
    }
  }, [collapsed, persistState, storageKey]);

  // Actions
  const toggle = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const collapse = useCallback(() => {
    setCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
  }, []);

  const setActiveItem = useCallback((itemId: string | null) => {
    setActiveItemId(itemId);
  }, []);

  const setHoveredItem = useCallback((itemId: string | null) => {
    setHoveredItemId(itemId);
  }, []);

  return {
    // State
    collapsed,
    activeItemId,
    hoveredItemId,
    
    // Actions
    toggle,
    collapse,
    expand,
    setActiveItem,
    setHoveredItem,
    
    // Builder
    builder,
    
    // Config
    config: {
      width,
      collapsedWidth,
      position,
      variant,
    },
  };
}

// Hook for sidebar with sections
export function useSidebarWithSections(
  sections: any[],
  options: UseSidebarOptions = {}
) {
  const sidebar = useSidebar(options);
  
  // Add sections to builder
  sections.forEach(section => {
    sidebar.builder.addSection(section);
  });

  return {
    ...sidebar,
    sections: sidebar.builder.build().sections,
  };
}

// Hook for responsive sidebar
export function useResponsiveSidebar(options: UseSidebarOptions = {}) {
  const [isMobile, setIsMobile] = useState(false);
  
  const sidebar = useSidebar({
    ...options,
    defaultCollapsed: true, // Start collapsed on mobile
  });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      sidebar.collapse();
    }
  }, [isMobile, sidebar]);

  return {
    ...sidebar,
    isMobile,
    shouldShowOverlay: isMobile && !sidebar.collapsed,
  };
}

// Hook for sidebar with navigation
export function useSidebarNavigation(
  navigationItems: any[],
  options: UseSidebarOptions = {}
) {
  const sidebar = useSidebar(options);
  const [currentPath, setCurrentPath] = useState('');

  // Update current path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  // Find active item based on current path
  const findActiveItem = (items: any[], path: string): string | null => {
    for (const item of items) {
      if (item.href === path) {
        return item.id;
      }
      if (item.children) {
        const childActive = findActiveItem(item.children, path);
        if (childActive) return childActive;
      }
    }
    return null;
  };

  // Set active item based on current path
  useEffect(() => {
    const activeId = findActiveItem(navigationItems, currentPath);
    sidebar.setActiveItem(activeId);
  }, [currentPath, navigationItems, sidebar]);

  // Handle navigation
  const handleNavigation = (item: any) => {
    if (item.href) {
      // Update active item
      sidebar.setActiveItem(item.id);
      
      // Navigate
      if (item.href.startsWith('http')) {
        window.open(item.href, '_blank');
      } else {
        window.location.href = item.href;
      }
    }
    
    if (item.onClick) {
      item.onClick();
    }
  };

  return {
    ...sidebar,
    currentPath,
    handleNavigation,
  };
}
