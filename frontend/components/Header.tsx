'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Menu, X, Home, MessageCircle, FolderOpen, Mail, Globe } from 'lucide-react';

interface HeaderProps {
  className?: string;
}

const navItems = [
  { href: '/', labelKey: 'home' as const, shortKey: 'home' as const, icon: Home },
  { href: '/private-community', labelKey: 'community' as const, shortKey: 'communityShort' as const, icon: MessageCircle },
  { href: '/projects', labelKey: 'projects' as const, shortKey: 'projects' as const, icon: FolderOpen },
  { href: '/contacts', labelKey: 'contacts' as const, shortKey: 'contacts' as const, icon: Mail },
];

export default function Header({ 
  className = ''
}: HeaderProps) {
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [menuOpening, setMenuOpening] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
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

  const closeMenu = () => {
    setMenuClosing(true);
  };

  const handleMenuTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || !menuClosing) return;
    requestAnimationFrame(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      document.body.style.overflow = '';
    });
  };

  const openMenu = () => {
    setMenuOpening(true);
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen || menuClosing) return;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => setMenuOpening(false), 40);
    return () => clearTimeout(t);
  }, [menuOpen, menuClosing]);

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

  const linkClass = (path: string) =>
    `flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
      isActive(path) ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      {/* Mobile: кнопка меню слева */}
      <header className={`fixed top-2 sm:top-4 left-4 md:left-1/2 md:-translate-x-1/2 z-50 ${className}`} ref={menuRef}>
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg text-white hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Мобильная панель слева: оверлей + меню */}
      {menuOpen && (
        <>
          {/* Затемнение фона */}
          <div
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm md:hidden transition-opacity duration-500 ease-out"
            style={{ opacity: menuOpening ? 0 : menuClosing ? 0 : 1 }}
            onClick={closeMenu}
            aria-hidden
          />
          {/* Панель меню слева */}
          <div
            className="fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] md:hidden flex flex-col bg-black/70 backdrop-blur-xl border-r border-white/10 shadow-2xl py-6 px-4 transition-[transform] duration-500 ease-out"
            style={{
              transform: menuOpening ? 'translateX(-100%)' : menuClosing ? 'translateX(-100%)' : 'translateX(0)',
            }}
            onTransitionEnd={handleMenuTransitionEnd}
          >
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={closeMenu}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const label = item.href === '/' ? t('home') : (item.href === '/private-community' ? t(item.shortKey) : t(item.labelKey));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={linkClass(item.href)}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 my-4" />
            <button
              type="button"
              onClick={() => {
                handleLanguageToggle();
                closeMenu();
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              title={t('switchLanguage')}
            >
              <Globe className="h-5 w-5 shrink-0" />
              {t('switchLanguage')} — {languages[currentLanguageIndex].shortName}
            </button>
          </div>
        </>
      )}

      {/* Desktop: плавающий хедер */}
      <header className={`fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 hidden md:block ${className}`}>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-lg px-3 md:px-4 py-1.5 sm:py-2">
          <div className="flex items-center gap-1 md:gap-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center hover:opacity-80 transition-opacity p-1.5 flex-shrink-0"
            >
              <img
                src="/images/purple afinka.png"
                alt="Afina DAO"
                className="w-5 h-5 md:w-6 md:h-6 rounded-md"
              />
            </button>
            <div className="w-px h-4 md:h-6 bg-white/20" />
            <Link
              href="/private-community"
              className={`px-2 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive('/private-community') ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t('community')}
            </Link>
            <Link
              href="/projects"
              className={`px-2 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive('/projects') ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t('projects')}
            </Link>
            <Link
              href="/contacts"
              className={`px-2 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive('/contacts') ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t('contacts')}
            </Link>
            <div className="w-px h-4 md:h-6 bg-white/20" />
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 flex-shrink-0"
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
