import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../contexts/ThemeContext';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

const montserrat = Montserrat({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Afina DAO',
  description: 'Professional crypto wallet management and automation platform',
  icons: {
    icon: '/images/purple afinka.png',
    shortcut: '/images/purple afinka.png',
    apple: '/images/purple afinka.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  
  return (
    <html lang={locale}>
      <body className={montserrat.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress browser extension errors (e.g., MetaMask, Web3 wallets)
              if (typeof window !== 'undefined') {
                const originalError = console.error;
                console.error = function(...args) {
                  const errorMessage = args.join(' ');
                  // Filter out common browser extension errors
                  if (
                    errorMessage.includes('Cannot redefine property: ethereum') ||
                    errorMessage.includes('chrome-extension://') ||
                    errorMessage.includes('moz-extension://') ||
                    errorMessage.includes('evmAsk.js')
                  ) {
                    return; // Suppress these errors
                  }
                  originalError.apply(console, args);
                };
              }
            `,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}