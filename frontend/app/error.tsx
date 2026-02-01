'use client';

import { useEffect } from 'react';
import { normalizeErrorMessage } from '@/lib/error-utils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Filter out Event objects before they cause issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
        const r = e.reason;
        if (r && typeof r === 'object') {
          const isEvent = r.constructor?.name === 'Event' || 
                         r.constructor?.name === 'SyntheticEvent' ||
                         String(r) === '[object Event]' ||
                         (r.type && (r.target !== undefined || r.currentTarget !== undefined));
          if (isEvent) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        if (typeof r === 'string' && r === '[object Event]') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      };
    }
  }, []);

  const message = normalizeErrorMessage(error);

  useEffect(() => {
    // Only log if it's not an Event object
    if (error && typeof error === 'object') {
      const isEvent = error.constructor?.name === 'Event' || String(error) === '[object Event]';
      if (!isEvent) {
        console.error('Application error:', error);
      }
    } else {
      console.error('Application error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center p-6">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Что-то пошло не так</h2>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <button
          onClick={reset}
          className="px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
