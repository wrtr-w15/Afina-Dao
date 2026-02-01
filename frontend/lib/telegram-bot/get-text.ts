// Загрузка текстов и кнопок бота из БД с кэшем и подстановкой плейсхолдеров

import { getConnection } from '@/lib/database';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 минут (увеличено для производительности)
const cache = new Map<string, { value: string; expires: number }>();
const buttonsCache = new Map<string, { keyboard: { inline_keyboard: any[][] }; expires: number }>();

// Предзагрузка всех текстов при старте
let textsPreloaded = false;

function replaceParams(text: string, params?: Record<string, string>): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) {
    const placeholder = `{{${k}}}`;
    if (out.includes(placeholder)) {
      out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '');
      console.log(`[Telegram Bot] Replaced placeholder ${placeholder} with: ${v ?? '(empty)'}`);
    }
  }
  return out;
}

// Предзагрузка всех текстов для быстрого доступа
export async function preloadAllTexts(): Promise<void> {
  if (textsPreloaded) return;
  
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT `key`, value, buttons FROM telegram_bot_texts'
    );
    const now = Date.now();
    for (const row of rows as any[]) {
      if (row.value) {
        cache.set(row.key, { value: row.value, expires: now + CACHE_TTL_MS });
      }
      if (row.buttons) {
        try {
          let arr: any[][];
          if (typeof row.buttons === 'string') {
            arr = JSON.parse(row.buttons);
          } else {
            arr = row.buttons;
          }
          if (Array.isArray(arr) && arr.length > 0) {
            buttonsCache.set(row.key, { keyboard: { inline_keyboard: arr }, expires: now + CACHE_TTL_MS });
          }
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
    }
    textsPreloaded = true;
    console.log(`[Telegram Bot] Preloaded ${cache.size} texts and ${buttonsCache.size} keyboards`);
  } catch (error) {
    console.error('[Telegram Bot] Error preloading texts:', error);
  } finally {
    connection.release();
  }
}

export async function getBotText(key: string, params?: Record<string, string>): Promise<string> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    const result = replaceParams(cached.value, params);
    console.log(`[Telegram Bot] Text "${key}" from cache:`, result ? `"${result.substring(0, 100)}..." (length: ${result.length})` : 'empty');
    return result;
  }

  // Если кэш истёк, загружаем из БД
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT value FROM telegram_bot_texts WHERE `key` = ?',
      [key]
    );
    const row = (rows as any[])[0];
    console.log(`[Telegram Bot] DB query for "${key}":`, row ? `found row with value length: ${row.value?.length || 0}` : 'no rows found');
    const value = row?.value;
    if (value != null && value !== '') {
      cache.set(key, { value, expires: now + CACHE_TTL_MS });
      const result = replaceParams(value, params);
      console.log(`[Telegram Bot] Text "${key}" loaded from DB:`, result ? `"${result.substring(0, 100)}..." (length: ${result.length})` : 'empty');
      return result;
    } else {
      console.log(`[Telegram Bot] Text "${key}" not found in DB or empty`);
    }
  } catch (error) {
    console.error(`[Telegram Bot] Error loading text "${key}":`, error);
  } finally {
    connection.release();
  }
  return '';
}

export function clearBotTextCache(): void {
  cache.clear();
  buttonsCache.clear();
  textsPreloaded = false;
}

export interface InlineButtonRow {
  text: string;
  callback_data?: string;
  url?: string;
}

/** Клавиатура для сообщения по ключу. null если не задана или пустая. */
export async function getBotButtons(key: string, params?: Record<string, string>): Promise<{ inline_keyboard: InlineButtonRow[][] } | null> {
  const now = Date.now();
  // Не используем кэш если есть параметры для замены
  const cached = params ? null : buttonsCache.get(key);
  if (cached && cached.expires > now) {
    return cached.keyboard;
  }

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT buttons FROM telegram_bot_texts WHERE `key` = ?',
      [key]
    );
    const raw = (rows as any[])[0]?.buttons;
    if (raw == null) {
      console.log(`[Telegram Bot] No buttons found in DB for key: ${key}`);
      return null;
    }
    
    console.log(`[Telegram Bot] Raw buttons from DB for ${key}:`, typeof raw === 'string' ? raw.substring(0, 200) : raw);
    
    let arr: InlineButtonRow[][];
    if (typeof raw === 'string') {
      try {
        arr = JSON.parse(raw);
      } catch (parseError) {
        console.error(`[Telegram Bot] Failed to parse buttons JSON for ${key}:`, parseError);
        return null;
      }
    } else if (Array.isArray(raw)) {
      arr = raw as InlineButtonRow[][];
    } else {
      console.warn(`[Telegram Bot] Buttons for ${key} is not array or string:`, typeof raw);
      return null;
    }
    if (!Array.isArray(arr) || arr.length === 0) {
      console.log(`[Telegram Bot] Buttons array is empty for ${key}`);
      return null;
    }
    
    console.log(`[Telegram Bot] Processing ${arr.length} button rows for ${key} with params:`, params);
    
    const keyboard: InlineButtonRow[][] = [];
    for (const row of arr) {
      if (!Array.isArray(row)) continue;
      const filtered: InlineButtonRow[] = [];
      for (const btn of row) {
        if (!btn || typeof btn.text !== 'string' || !btn.text.trim()) continue;
        
        // Обрабатываем плейсхолдеры в тексте
        let btnText = btn.text.trim();
        if (params) {
          btnText = replaceParams(btnText, params);
        }
        
        // Обрабатываем URL с плейсхолдерами
        let urlVal = btn.url != null && String(btn.url).trim() !== '' ? String(btn.url).trim() : '';
        if (urlVal && params) {
          const originalUrl = urlVal;
          urlVal = replaceParams(urlVal, params);
          if (originalUrl !== urlVal) {
            console.log(`[Telegram Bot] Replaced URL placeholder: ${originalUrl} -> ${urlVal}`);
          }
        }
        
        // Обрабатываем callback_data с плейсхолдерами
        let cbVal = String(btn.callback_data ?? '').trim();
        if (cbVal && params) {
          cbVal = replaceParams(cbVal, params);
        }
        
        // Проверяем валидность URL (не должен содержать плейсхолдеры)
        if (urlVal && (urlVal.includes('{{') || urlVal.includes('}}'))) {
          console.warn(`[Telegram Bot] Skipping button with unresolved placeholder in URL: ${urlVal}`);
          console.warn(`[Telegram Bot] Available params:`, Object.keys(params || {}));
          continue; // Пропускаем кнопку с неразрешенными плейсхолдерами
        }
        
        // Проверяем, что URL валидный (начинается с http:// или https://)
        if (urlVal && !urlVal.match(/^https?:\/\//)) {
          console.warn(`[Telegram Bot] Invalid URL format (must start with http:// or https://): ${urlVal}`);
          continue; // Пропускаем кнопку с невалидным URL
        }
        
        const hasData = (cbVal && cbVal.trim() !== '') || (urlVal && urlVal.trim() !== '');
        if (!hasData) continue;
        
        if (cbVal && typeof Buffer !== 'undefined' && Buffer.byteLength(cbVal, 'utf8') > 64) {
          while (cbVal && Buffer.byteLength(cbVal, 'utf8') > 64) cbVal = cbVal.slice(0, -1);
        }
        
        if (urlVal && urlVal.trim() !== '') {
          filtered.push({ text: btnText, url: urlVal });
        } else if (cbVal && cbVal.trim() !== '') {
          filtered.push({ text: btnText, callback_data: cbVal });
        }
      }
      if (filtered.length > 0) keyboard.push(filtered);
    }
    if (keyboard.length === 0) return null;
    const result = { inline_keyboard: keyboard };
    // Кэшируем только если нет параметров
    if (!params) {
      buttonsCache.set(key, { keyboard: result, expires: now + CACHE_TTL_MS });
    }
    return result;
  } catch {
    return null;
  } finally {
    connection.release();
  }
}
