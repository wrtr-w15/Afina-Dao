'use client';

import { ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import Sidebar from '@/components/sidebar/Sidebar';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showSidebar?: boolean;
}

export default function Layout({ 
  children, 
  title, 
  description, 
  showSidebar = true
}: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Определяем размер экрана с debouncing
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    const checkScreenSize = () => {
      const isMobileSize = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(isMobileSize);
      if (isMobileSize) {
        setIsSidebarCollapsed(true); // На мобильных устройствах сайдбар свернут по умолчанию
      } else {
        setIsSidebarCollapsed(false); // На больших экранах сайдбар всегда видим
      }
    };

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkScreenSize, 150); // Debounce 150ms
    };

    checkScreenSize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSidebarToggle = () => {
    if (isMobile) {
      // На мобильных устройствах открываем мобильное меню в хедере
      setIsSidebarCollapsed(true);
    } else {
      // На больших экранах просто сворачиваем сайдбар
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <>
      <Head>
        <title>{title || 'Afina DAO Wiki'}</title>
        <meta name="description" content={description || 'Comprehensive knowledge base for Afina DAO'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        {/* Header */}
        <Header
          onSearch={(query) => {
            console.log('Search query:', query);
            // TODO: Implement search functionality
          }}
          onMenuToggle={handleSidebarToggle}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Sidebar - фиксированный на больших экранах */}
        {showSidebar && !isMobile && !isSidebarCollapsed && (
          <div className="fixed left-0 top-16 bottom-0 w-64 z-40 transition-all duration-300">
            <Sidebar />
          </div>
        )}

        {/* Main content */}
        <main className={`transition-all duration-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen pt-16 ${
          showSidebar && !isSidebarCollapsed && !isMobile ? 'ml-64' : 'ml-0'
        }`}>
          <div className="p-6 pb-16">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}