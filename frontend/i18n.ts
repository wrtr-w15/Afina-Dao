import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Can be imported from a shared config
const locales = ['en', 'ru', 'ua'];

export default getRequestConfig(async () => {
  // Получаем язык из cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE');
  
  // Используем язык из cookie или русский по умолчанию
  const locale = localeCookie?.value && locales.includes(localeCookie.value) 
    ? localeCookie.value 
    : 'ru';

  const messages = (await import(`./messages/${locale}.json`)).default as Record<string, unknown>;
  // Ensure home.viewProjects and home.goToCommunity exist (fallback for missing keys)
  if (messages?.home && typeof messages.home === 'object') {
    const home = messages.home as Record<string, string>;
    if (!home.viewProjects) home.viewProjects = locale === 'ru' ? 'Посмотреть проекты' : locale === 'ua' ? 'Переглянути проекти' : 'View projects';
    if (!home.goToCommunity) home.goToCommunity = locale === 'ru' ? 'Перейти к сообществу' : locale === 'ua' ? 'Перейти до спільноти' : 'Go to community';
  }
  return {
    locale,
    messages
  };
});