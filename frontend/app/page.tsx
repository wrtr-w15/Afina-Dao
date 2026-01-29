'use client';

import React from 'react';
import PrismaticBurst from '@/components/PrismaticBurst';
import SplitText from '@/components/SplitText';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <Header />
      
      {/* PrismaticBurst Background - Full Screen */}
      <div className="fixed inset-0 z-0">
        <PrismaticBurst
          animationType="rotate3d"
          intensity={2}
          speed={0.5}
          distort={0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={0}
          mixBlendMode="lighten"
          colors={['#ff007a', '#4d3dff', '#ffffff']}
        />
      </div>
       
      {/* Content Overlay */}
      <div className="relative z-10 w-full h-screen flex flex-col items-center justify-center text-center space-y-6 px-4">
        <SplitText
          text="AfinaDAO"
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
        <p className="text-xl md:text-2xl lg:text-3xl text-gray-200 leading-relaxed drop-shadow-md">
          Официально сообщество Afina
        </p>
      </div>
    </div>
  );
}
