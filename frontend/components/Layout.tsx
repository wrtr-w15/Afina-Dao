'use client';

import { ReactNode } from 'react';
import Head from 'next/head';
import Header from './Header';
import Sidebar from './sidebar/Sidebar';

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
          onMenuToggle={() => {
            // TODO: Implement mobile menu toggle
          }}
          showMenuButton={showSidebar}
        />

        <div className="flex pt-16">
          {showSidebar && <Sidebar />}

          <main className={`flex-1 transition-all duration-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${showSidebar ? 'ml-64' : ''}`}>
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}