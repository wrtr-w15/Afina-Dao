export const SUPPORTED_LANGUAGES = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ua', name: 'Українська', flag: '🇺🇦' }
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'ru';

