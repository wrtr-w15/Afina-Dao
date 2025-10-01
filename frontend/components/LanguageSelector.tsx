'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Popover } from './ui/Popover';
import { Button } from './ui/Button';
import { useTranslations } from 'next-intl';

interface Language {
  code: string;
  name: string;
  shortName: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', shortName: 'EN' },
  { code: 'ru', name: 'Русский', shortName: 'RU' },
  { code: 'uk', name: 'Українська', shortName: 'UA' },
];

export default function LanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[1]); // Default to Russian
  const t = useTranslations('language');

  useEffect(() => {
    // Загружаем сохраненный язык из localStorage
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage) {
      const language = languages.find(lang => lang.code === savedLanguage);
      if (language) {
        setCurrentLanguage(language);
      }
    }
  }, []);

  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language);
    
    // Сохраняем выбранный язык в localStorage
    localStorage.setItem('selectedLanguage', language.code);
    
    // Устанавливаем cookie для серверной стороны
    document.cookie = `NEXT_LOCALE=${language.code}; path=/; max-age=31536000`;
    
    // Перезагружаем страницу для применения изменений
    window.location.reload();
  };

  return (
    <Popover
      content={
        <div className="w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('selectLanguage')}
            </h3>
            <div className="space-y-2">
              {languages.map((language) => (
                <label
                  key={language.code}
                  className="flex items-center space-x-3 cursor-pointer p-2"
                >
                  <div className="relative">
                    <input
                      type="radio"
                      name="language"
                      value={language.code}
                      checked={currentLanguage.code === language.code}
                      onChange={() => handleLanguageChange(language)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 border-2 rounded-full transition-all duration-200 ${
                      currentLanguage.code === language.code
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600 bg-transparent'
                    }`}>
                      {currentLanguage.code === language.code && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {language.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      }
      trigger="click"
      placement="top"
    >
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-transparent hover:text-gray-500 dark:hover:text-gray-400"
      >
        <Globe className="h-3 w-3" />
        <span>{currentLanguage.shortName}</span>
      </Button>
    </Popover>
  );
}
