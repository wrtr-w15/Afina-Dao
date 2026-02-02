'use client';

import { ReactNode } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showSidebar?: boolean;
}

export default function Layout({ 
  children, 
  title, 
  description
}: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title || 'Afina DAO Wiki'}</title>
        <meta name="description" content={description || 'Comprehensive knowledge base for Afina DAO'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative min-h-screen bg-[#0a0a0f] text-white">
        {/* Animated gradient background */}
        <div className="fixed inset-0 z-0">
          {/* Base dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f]" />
          
          {/* Subtle animated glow */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse-slow-delayed" />
          </div>
          
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
        </div>

        {/* Header */}
        <Header />

        {/* Main content */}
        <main className="relative z-10 min-h-screen pt-16">
          <div className="p-6 pb-16">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
