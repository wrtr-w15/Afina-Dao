'use client';

import { useEffect } from 'react';

/**
 * Early error handler component that prevents [object Event] errors
 * This component should be rendered early in the app
 * Uses multiple strategies to catch errors before Next.js devtools
 */
export default function ErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isEventObject = (r: any): boolean => {
      if (r == null) return false;
      if (typeof r === 'string') {
        return r === '[object Event]' || r.trim() === '[object Event]';
      }
      if (typeof r === 'object') {
        const constructorName = r.constructor?.name || 
          (r.constructor && r.constructor.toString().match(/function\s+(\w+)/)?.[1]);
        return (
          constructorName === 'Event' || 
          constructorName === 'SyntheticEvent' || 
          constructorName === 'AbortError' ||
          r.constructor === Event ||
          (r instanceof Event) ||
          String(r) === '[object Event]' ||
          (r.type && (r.target !== undefined || r.currentTarget !== undefined))
        );
      }
      return false;
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (isEventObject(e.reason)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Also try to stop any error reporting
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    // Add multiple listeners with different priorities
    // 1. Capture phase listener (highest priority)
    window.addEventListener('unhandledrejection', handleUnhandledRejection, { capture: true, passive: false });
    
    // 2. Regular listener as backup
    window.addEventListener('unhandledrejection', handleUnhandledRejection, { passive: false });
    
    // 3. Also intercept window.onunhandledrejection if it exists
    const originalOnUnhandledRejection = (window as any).onunhandledrejection;
    if (originalOnUnhandledRejection) {
      (window as any).onunhandledrejection = function(e: PromiseRejectionEvent) {
        if (!isEventObject(e.reason)) {
          return originalOnUnhandledRejection.call(window, e);
        }
        e.preventDefault();
        e.stopPropagation();
      };
    }
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, { capture: true } as any);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      if (originalOnUnhandledRejection) {
        (window as any).onunhandledrejection = originalOnUnhandledRejection;
      }
    };
  }, []);

  return null;
}
