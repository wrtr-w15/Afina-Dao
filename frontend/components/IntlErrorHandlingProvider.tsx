'use client';

import { NextIntlClientProvider } from 'next-intl';
import { IntlErrorCode } from 'next-intl';

const FALLBACKS: Record<string, string> = {
  'home.viewProjects': 'View projects',
  'home.goToCommunity': 'Go to community',
};

export default function IntlErrorHandlingProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      getMessageFallback={({ namespace, key, error }) => {
        if (error?.code === IntlErrorCode.MISSING_MESSAGE) {
          const path = [namespace, key].filter(Boolean).join('.');
          if (FALLBACKS[path]) return FALLBACKS[path];
        }
        return [namespace, key].filter(Boolean).join('.');
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
