import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../contexts/ThemeContext';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import IntlErrorHandlingProvider from '@/components/IntlErrorHandlingProvider';
import ErrorHandler from '../components/ErrorHandler';
import PageBackground from '../components/PageBackground';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // CRITICAL: This must run BEFORE Next.js devtools loads
              // Prevent "[object Event]" from unhandled promise rejections
              (function() {
                if (typeof window === 'undefined') return;
                
                // Store original handlers before Next.js can override them
                var originalAddEventListener = window.addEventListener;
                var handlers = [];
                
                // Override addEventListener to intercept unhandledrejection handlers
                window.addEventListener = function(type, listener, options) {
                  if (type === 'unhandledrejection') {
                    // Wrap listener to check for Event objects first
                    var wrapped = function(e) {
                      var r = e.reason;
                      var isEvent = false;
                      
                      if (r == null) {
                        isEvent = false;
                      } else if (typeof r === 'string') {
                        isEvent = r === '[object Event]' || r.trim() === '[object Event]';
                      } else if (typeof r === 'object') {
                        var cn = r.constructor?.name || (r.constructor && r.constructor.toString().match(/function\\s+(\\w+)/)?.[1]);
                        isEvent = cn === 'Event' || cn === 'SyntheticEvent' || cn === 'AbortError' ||
                                 r.constructor === Event || (r instanceof Event) ||
                                 String(r) === '[object Event]' ||
                                 (r.type && (r.target !== undefined || r.currentTarget !== undefined));
                      }
                      
                      if (isEvent) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                      }
                      
                      // Call original listener if not prevented
                      if (listener) return listener.call(this, e);
                    };
                    handlers.push({ original: listener, wrapped: wrapped });
                    return originalAddEventListener.call(this, type, wrapped, options);
                  }
                  return originalAddEventListener.call(this, type, listener, options);
                };
                
                // Set up our own handler with highest priority
                originalAddEventListener.call(window, 'unhandledrejection', function(e) {
                  var r = e.reason;
                  var isEvent = false;
                  
                  if (r == null) {
                    isEvent = false;
                  } else if (typeof r === 'string') {
                    isEvent = r === '[object Event]' || r.trim() === '[object Event]';
                  } else if (typeof r === 'object') {
                    var cn = r.constructor?.name || (r.constructor && r.constructor.toString().match(/function\\s+(\\w+)/)?.[1]);
                    isEvent = cn === 'Event' || cn === 'SyntheticEvent' || cn === 'AbortError' ||
                             r.constructor === Event || (r instanceof Event) ||
                             String(r) === '[object Event]' ||
                             (r.type && (r.target !== undefined || r.currentTarget !== undefined));
                  }
                  
                  if (isEvent) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                  }
                }, true);
                
                // Suppress console.error for Event objects
                var originalConsoleError = console.error;
                console.error = function() {
                  for (var i = 0; i < arguments.length; i++) {
                    var arg = arguments[i];
                    if (typeof arg === 'string' && arg === '[object Event]') return;
                    if (arg && typeof arg === 'object' && (arg.constructor?.name === 'Event' || String(arg) === '[object Event]')) return;
                  }
                  var msg = Array.prototype.join.call(arguments, ' ');
                  if (msg.includes('[object Event]') || 
                      msg.includes('Cannot redefine property: ethereum') ||
                      msg.includes('chrome-extension://') ||
                      msg.includes('moz-extension://') ||
                      msg.includes('evmAsk.js')) {
                    return;
                  }
                  originalConsoleError.apply(console, arguments);
                };
              })();
            `,
          }}
        />
      </head>
      <body className={montserrat.className}>
        <ErrorHandler />
        <NextIntlClientProvider messages={messages}>
          <IntlErrorHandlingProvider locale={locale}>
            <ThemeProvider>
              <PageBackground />
              {children}
            </ThemeProvider>
          </IntlErrorHandlingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}