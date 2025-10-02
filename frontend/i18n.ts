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

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});