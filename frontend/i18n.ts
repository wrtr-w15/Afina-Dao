import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ locale }) => {
  // Получаем предпочтительный язык из cookies
  const cookieStore = await cookies();
  const preferredLocale = cookieStore.get('NEXT_LOCALE')?.value || locale || 'ru';
  
  return {
    locale: preferredLocale,
    messages: (await import(`./messages/${preferredLocale}.json`)).default
  };
});
