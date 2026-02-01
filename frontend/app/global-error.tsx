'use client';

import { normalizeErrorMessage } from '@/lib/error-utils';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = normalizeErrorMessage(error);

  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0f17', color: '#e5e5e5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Что-то пошло не так</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: 24 }}>{message}</p>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
