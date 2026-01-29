'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface HeaderProps {
  className?: string;
}

export default function Header({ 
  className = ''
}: HeaderProps) {
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(1); // Default to Russian (index 1)
  
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('nav');

  const languages = [
    { code: 'en', shortName: 'EN' },
    { code: 'ru', shortName: 'RU' },
    { code: 'ua', shortName: 'UA' },
  ];

  useEffect(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage) {
      const index = languages.findIndex(lang => lang.code === savedLanguage);
      if (index !== -1) {
        setCurrentLanguageIndex(index);
      }
    }
  }, []);

  const handleLanguageToggle = () => {
    const nextIndex = (currentLanguageIndex + 1) % languages.length;
    const nextLanguage = languages[nextIndex];
    
    setCurrentLanguageIndex(nextIndex);
    localStorage.setItem('selectedLanguage', nextLanguage.code);
    document.cookie = `NEXT_LOCALE=${nextLanguage.code}; path=/; max-age=31536000`;
    window.location.reload();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };


  return (
    <>
      {/* Floating Island Header */}
      <header className={`fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 ${className}`}>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2">
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
            {/* Logo */}
            <button 
              onClick={() => router.push('/')}
              className="flex items-center hover:opacity-80 transition-opacity p-1 sm:p-1.5 flex-shrink-0"
            >
              <img 
                src="/images/purple afinka.png" 
                alt="Afina DAO" 
                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-md"
              />
            </button>

            {/* Divider */}
            <div className="w-px h-4 sm:h-5 md:h-6 bg-white/20 hidden sm:block" />

            {/* Navigation Links */}
            <Link
              href="/private-community"
              className={`px-1.5 sm:px-2 md:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive('/private-community')
                  ? 'bg-white/20 text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{t('community')}</span>
              <span className="sm:hidden">{t('communityShort')}</span>
            </Link>
            <Link
              href="/projects"
              className={`px-1.5 sm:px-2 md:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive('/projects')
                  ? 'bg-white/20 text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t('projects')}
            </Link>
            <Link
              href="/contacts"
              className={`px-1.5 sm:px-2 md:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive('/contacts')
                  ? 'bg-white/20 text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t('contacts')}
            </Link>

            {/* Divider */}
            <div className="w-px h-4 sm:h-5 md:h-6 bg-white/20 hidden sm:block" />

            {/* Language Selector */}
            <button
              onClick={handleLanguageToggle}
              className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 flex-shrink-0"
              title={t('switchLanguage')}
            >
              {languages[currentLanguageIndex].shortName}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
