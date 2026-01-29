// Загрузка текстов бота из БД с кэшем и подстановкой плейсхолдеров

import { getConnection } from '@/lib/database';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 минуты
const cache = new Map<string, { value: string; expires: number }>();

function replaceParams(text: string, params?: Record<string, string>): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '');
  }
  return out;
}

export async function getBotText(key: string, params?: Record<string, string>): Promise<string> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    return replaceParams(cached.value, params);
  }

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT value FROM telegram_bot_texts WHERE `key` = ?',
      [key]
    );
    const value = (rows as any[])[0]?.value;
    if (value != null) {
      cache.set(key, { value, expires: now + CACHE_TTL_MS });
      return replaceParams(value, params);
    }
  } finally {
    connection.release();
  }
  return '';
}

export function clearBotTextCache(): void {
  cache.clear();
}
