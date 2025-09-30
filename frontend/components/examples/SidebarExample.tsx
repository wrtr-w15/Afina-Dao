import React from 'react';
import { 
  Home, 
  BookOpen, 
  Users, 
  Settings, 
  Search, 
  Bell, 
  HelpCircle,
  ChevronDown,
  Star,
  TrendingUp,
  Clock,
  Tag
} from 'lucide-react';
import { Sidebar, SidebarBuilder } from '@/components/ui/Sidebar';

// Example usage of Sidebar with Builder
export function SidebarExample() {
  // Create sidebar using builder
  const sidebarConfig = new SidebarBuilder()
    .width(280)
    .collapsedWidth(64)
    .position('fixed')
    .variant('default')
    .showToggle(true)
    
    // Navigation section
    .addNavigationSection([
      {
        id: 'home',
        label: 'Home',
        icon: <Home className="h-5 w-5" />,
        href: '/',
        active: true,
      },
      {
        id: 'articles',
        label: 'Articles',
        icon: <BookOpen className="h-5 w-5" />,
        href: '/articles',
        badge: '12',
      },
      {
        id: 'search',
        label: 'Search',
        icon: <Search className="h-5 w-5" />,
        onClick: () => console.log('Search clicked'),
      },
    ])
    
    // Categories section
    .addCategoriesSection([
      {
        id: 'getting-started',
        label: 'Getting Started',
        icon: <Star className="h-5 w-5" />,
        href: '/category/getting-started',
        children: [
          {
            id: 'installation',
            label: 'Installation',
            href: '/category/getting-started/installation',
          },
          {
            id: 'configuration',
            label: 'Configuration',
            href: '/category/getting-started/configuration',
          },
        ],
      },
      {
        id: 'advanced',
        label: 'Advanced Topics',
        icon: <TrendingUp className="h-5 w-5" />,
        href: '/category/advanced',
        children: [
          {
            id: 'performance',
            label: 'Performance',
            href: '/category/advanced/performance',
          },
          {
            id: 'security',
            label: 'Security',
            href: '/category/advanced/security',
          },
        ],
      },
      {
        id: 'recent',
        label: 'Recent Articles',
        icon: <Clock className="h-5 w-5" />,
        href: '/recent',
        badge: '5',
      },
    ])
    
    // Settings section
    .addSettingsSection([
      {
        id: 'profile',
        label: 'Profile',
        icon: <Users className="h-5 w-5" />,
        href: '/profile',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: <Bell className="h-5 w-5" />,
        href: '/notifications',
        badge: '3',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="h-5 w-5" />,
        href: '/settings',
      },
      {
        id: 'help',
        label: 'Help & Support',
        icon: <HelpCircle className="h-5 w-5" />,
        href: '/help',
      },
    ])
    
    .build();

  const handleItemClick = (item: any) => {
    console.log('Item clicked:', item);
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        {...sidebarConfig.config}
        sections={sidebarConfig.sections}
        onItemClick={handleItemClick}
        activeItemId="home"
      />
      
      <main className="flex-1 ml-64 p-6">
        <h1 className="text-2xl font-bold mb-4">Main Content</h1>
        <p className="text-gray-600">
          This is the main content area. The sidebar is positioned to the left.
        </p>
      </main>
    </div>
  );
}

// Alternative: Manual sidebar creation
export function ManualSidebarExample() {
  const sections = [
    {
      id: 'main',
      title: 'Main',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <Home className="h-5 w-5" />,
          href: '/dashboard',
          active: true,
        },
        {
          id: 'projects',
          label: 'Projects',
          icon: <BookOpen className="h-5 w-5" />,
          href: '/projects',
          badge: '8',
        },
      ],
    },
    {
      id: 'categories',
      title: 'Categories',
      collapsible: true,
      defaultCollapsed: false,
      items: [
        {
          id: 'web-dev',
          label: 'Web Development',
          icon: <Tag className="h-5 w-5" />,
          children: [
            {
              id: 'react',
              label: 'React',
              href: '/category/react',
            },
            {
              id: 'nextjs',
              label: 'Next.js',
              href: '/category/nextjs',
            },
          ],
        },
        {
          id: 'mobile-dev',
          label: 'Mobile Development',
          icon: <Tag className="h-5 w-5" />,
          children: [
            {
              id: 'react-native',
              label: 'React Native',
              href: '/category/react-native',
            },
            {
              id: 'flutter',
              label: 'Flutter',
              href: '/category/flutter',
            },
          ],
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar
        width={300}
        collapsedWidth={80}
        sections={sections}
        onItemClick={(item) => console.log('Clicked:', item)}
        activeItemId="dashboard"
        showToggle={true}
        position="fixed"
        variant="default"
      />
      
      <main className="flex-1 ml-80 p-6">
        <h1 className="text-2xl font-bold mb-4">Manual Sidebar Example</h1>
        <p className="text-gray-600">
          This example shows how to create a sidebar manually without the builder.
        </p>
      </main>
    </div>
  );
}

// Compact sidebar example
export function CompactSidebarExample() {
  const compactSections = [
    {
      id: 'navigation',
      items: [
        {
          id: 'home',
          label: 'Home',
          icon: <Home className="h-4 w-4" />,
          href: '/',
          active: true,
        },
        {
          id: 'articles',
          label: 'Articles',
          icon: <BookOpen className="h-4 w-4" />,
          href: '/articles',
        },
        {
          id: 'search',
          label: 'Search',
          icon: <Search className="h-4 w-4" />,
          href: '/search',
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar
        width={200}
        collapsedWidth={60}
        sections={compactSections}
        variant="compact"
        showToggle={true}
        position="fixed"
      />
      
      <main className="flex-1 ml-52 p-6">
        <h1 className="text-2xl font-bold mb-4">Compact Sidebar</h1>
        <p className="text-gray-600">
          This is a more compact sidebar with smaller icons and spacing.
        </p>
      </main>
    </div>
  );
}
