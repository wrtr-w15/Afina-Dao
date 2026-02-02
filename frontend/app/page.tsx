'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import SplitText from '@/components/SplitText';
import Header from '@/components/Header';

const GridScan = dynamic(() => import('@/components/GridScan'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 w-full h-full bg-black" />,
});

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <Header />
      
      {/* GridScan Background - Full Screen */}
      <div className="fixed inset-0 z-0 w-full h-full min-h-screen">
        <Suspense fallback={null}>
          <GridScan
            sensitivity={0.55}
            lineThickness={1}
            linesColor="#392e4e"
            gridScale={0.1}
            scanColor="#FF9FFC"
            scanOpacity={0.4}
            enablePost={true}
            bloomIntensity={0.6}
            chromaticAberration={0.002}
            noiseIntensity={0.01}
          />
        </Suspense>
      </div>
       
      {/* Content Overlay */}
      <div className="relative z-10 w-full h-screen flex flex-col items-center justify-center text-center space-y-6 px-4">
        <SplitText
          text={t('hero.title')}
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg"
          delay={50}
          duration={1.25}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
          tag="h1"
        />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/private-community"
            className="inline-flex items-center justify-center min-w-[200px] px-5 py-2.5 text-sm rounded-full bg-white text-gray-900 font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:bg-gray-100"
          >
            {t('goToCommunity')}
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center min-w-[200px] px-5 py-2.5 text-sm rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-gray-300 font-medium transition-all duration-200 hover:bg-white/10 hover:text-white"
          >
            {t('viewProjects')}
          </Link>
        </div>
      </div>
    </div>
  );
}
