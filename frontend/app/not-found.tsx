'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { gsap } from 'gsap';
import { Home, Sparkles } from 'lucide-react';
import Header from '@/components/Header';

export default function NotFound() {
  const t = useTranslations('notFound');
  const containerRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);
  const orbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set([codeRef.current, textRef.current, btnRef.current], { opacity: 0, y: 30 });
      gsap.to(codeRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.2 });
      gsap.to(textRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.5 });
      gsap.to(btnRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.8 });
      if (orbsRef.current) {
        const orbs = orbsRef.current.querySelectorAll('.orb');
        orbs.forEach((orb, i) => {
          gsap.fromTo(
            orb,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 0.6, duration: 1, delay: 0.3 + i * 0.1, ease: 'back.out(1.2)' }
          );
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#0a0a0f] text-white overflow-hidden flex flex-col items-center justify-center px-4 pt-20"
    >
      <Header />
      {/* Animated gradient orbs */}
      <div ref={orbsRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="orb absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-60 animate-float-slow"
          style={{
            left: '10%',
            top: '20%',
            background: 'radial-gradient(circle, #ff007a 0%, transparent 70%)',
          }}
        />
        <div
          className="orb absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-50 animate-float-medium"
          style={{
            right: '15%',
            bottom: '25%',
            background: 'radial-gradient(circle, #4d3dff 0%, transparent 70%)',
          }}
        />
        <div
          className="orb absolute w-[200px] h-[200px] rounded-full blur-[80px] opacity-40 animate-float-fast"
          style={{
            left: '50%',
            top: '60%',
            marginLeft: '-100px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 text-center max-w-2xl">
        {/* 404 — белый текст, розово-фиолетовое свечение */}
        <div ref={codeRef} className="relative inline-block mb-4">
          <span
            className="block text-[clamp(5rem,16vw,10rem)] font-bold leading-none tracking-tighter select-none text-white"
            style={{
              textShadow: '0 0 40px rgba(255,0,122,0.6), 0 0 80px rgba(77,61,255,0.3), 0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            404
          </span>
        </div>

        <p ref={textRef} className="text-lg md:text-xl text-gray-400 mb-10 font-light">
          {t('description')}
        </p>

        <Link
          ref={btnRef}
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-white bg-gradient-to-r from-[#ff007a] to-[#4d3dff] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#ff007a] focus:ring-offset-2 focus:ring-offset-[#0a0a0f] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,0,122,0.3)]"
        >
          <Home className="w-5 h-5" />
          {t('backToHome')}
        </Link>

        <p className="mt-8 text-sm text-gray-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#4d3dff]" />
          Afina DAO
        </p>
      </div>
    </div>
  );
}
