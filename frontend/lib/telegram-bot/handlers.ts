// Обработчики команд и callback для Telegram бота

import { getConnection } from '@/lib/database';
import { isTelegramBlockedForSubscription, isBlocked, notifyAdminBlockedAttempt } from '@/lib/blocklist';
import { sendTelegramMessageToAll } from '@/lib/telegram';
import { nowPayments } from '@/lib/nowpayments';
import { messages } from './messages';
import { getBotButtons } from './get-text';
import { generatePaymentHistoryToken } from '@/lib/payment-history-tokens';
import { addMonths } from '@/lib/utils';
import { 
  getMainMenuKeyboard,
  applySubscriptionLabelToWelcomeKeyboard,
  getPlanKeyboard, 
  getConfirmKeyboard, 
  getPaymentKeyboard,
  getSuccessKeyboard,
  getAccountKeyboard,
  getEmailInputKeyboard,
  getGoogleDriveEmailInputKeyboard,
  getConfirmDisconnectGoogleDriveKeyboard,
  getSocialsKeyboard,
  getConfirmDisconnectDiscordKeyboard,
  getConfirmDisconnectEmailKeyboard,
  getBackToMainKeyboard,
  getHelpKeyboard
} from './keyboards';
import crypto from 'crypto';

const SUBSCRIPTION_BOT_TOKEN = process.env.TELEGRAM_SUBSCRIPTION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${SUBSCRIPTION_BOT_TOKEN}`;

/** Таймаут запросов к Telegram API (мс), чтобы не держать соединения при нагрузке */
const TELEGRAM_FETCH_TIMEOUT_MS = 15000;
/** Таймаут внутренних API (промокоды, confirm-payment) при вызове из бота */
const INTERNAL_API_TIMEOUT_MS = 12000;

// Отправка сообщения
export async function sendMessage(chatId: number, text: string, keyboard?: any): Promise<any> {
  console.log(`[Telegram Bot] sendMessage called - chatId: ${chatId}, text length: ${text?.length || 0}, text preview: "${text?.substring(0, 100)}..."`);
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(keyboard && { reply_markup: keyboard })
    };
    console.log(`[Telegram Bot] sendMessage payload:`, JSON.stringify({ ...payload, text: text?.substring(0, 100) + '...' }));
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TELEGRAM_FETCH_TIMEOUT_MS)
    });
    const result = await response.json();
    if (!result.ok) {
      console.error(`[Telegram Bot] sendMessage error:`, result);
    } else {
      console.log(`[Telegram Bot] sendMessage success:`, result);
    }
    return result;
  } catch (error) {
    console.error(`[Telegram Bot] sendMessage exception:`, error);
    throw error;
  }
}

// Редактирование сообщения
export async function editMessage(chatId: number, messageId: number, text: string, keyboard?: any): Promise<any> {
  console.log(`[Telegram Bot] editMessage called - chatId: ${chatId}, messageId: ${messageId}, text length: ${text?.length || 0}, text preview: "${text?.substring(0, 100)}..."`);
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...(keyboard && { reply_markup: keyboard })
    };
    console.log(`[Telegram Bot] editMessage payload:`, JSON.stringify({ ...payload, text: text?.substring(0, 100) + '...' }));
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TELEGRAM_FETCH_TIMEOUT_MS)
    });
    const result = await response.json();
    if (!result.ok) {
      console.error(`[Telegram Bot] editMessage error:`, result);
    } else {
      console.log(`[Telegram Bot] editMessage success:`, result);
    }
    return result;
  } catch (error) {
    console.error(`[Telegram Bot] editMessage exception:`, error);
    throw error;
  }
}

// Удаление сообщения
export async function deleteMessage(chatId: number, messageId: number): Promise<any> {
  try {
    const response = await fetch(`${TELEGRAM_API}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      signal: AbortSignal.timeout(TELEGRAM_FETCH_TIMEOUT_MS)
    });
    const result = await response.json();
    if (!result.ok) {
      console.warn('[Telegram Bot] deleteMessage error:', result);
    }
    return result;
  } catch (error) {
    console.warn('[Telegram Bot] deleteMessage exception:', error);
    return { ok: false };
  }
}

// Ответ на callback
export async function answerCallback(callbackQueryId: string, text?: string): Promise<any> {
  try {
    const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      signal: AbortSignal.timeout(TELEGRAM_FETCH_TIMEOUT_MS)
    });
    const result = await response.json();
    if (!result.ok) {
      console.error(`[Telegram Bot] answerCallback error:`, result);
    }
    return result;
  } catch (error) {
    console.error(`[Telegram Bot] answerCallback exception:`, error);
    throw error;
  }
}

// Получение или создание пользователя (с кэшированием ID)
const userIdCache = new Map<number, { userId: string; expires: number }>();
const USER_ID_CACHE_TTL = 10 * 60 * 1000; // 10 минут

async function getOrCreateUser(telegramUser: any): Promise<{ id: string; isNew: boolean }> {
  const now = Date.now();
  const cached = userIdCache.get(telegramUser.id);
  if (cached && cached.expires > now) {
    // Обновляем данные пользователя асинхронно (не блокируем ответ)
    const connection = await getConnection();
    connection.execute(
      `UPDATE users SET telegram_username = ?, telegram_first_name = ?, telegram_last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?`,
      [telegramUser.username || null, telegramUser.first_name || null, telegramUser.last_name || null, telegramUser.id]
    ).finally(() => connection.release()).catch(() => {});
    
    // Обновляем кэш пользователя
    userDataCache.delete(telegramUser.id);
    
    return { id: cached.userId, isNew: false };
  }

  const connection = await getConnection();
  try {
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramUser.id]
    );

    if ((existing as any[]).length > 0) {
      const userId = (existing as any[])[0].id;
      await connection.execute(
        `UPDATE users SET telegram_username = ?, telegram_first_name = ?, telegram_last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?`,
        [telegramUser.username || null, telegramUser.first_name || null, telegramUser.last_name || null, telegramUser.id]
      );
      userIdCache.set(telegramUser.id, { userId, expires: now + USER_ID_CACHE_TTL });
      userDataCache.delete(telegramUser.id); // Инвалидируем кэш данных
      return { id: userId, isNew: false };
    }

    const userId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO users (id, telegram_id, telegram_username, telegram_first_name, telegram_last_name) VALUES (?, ?, ?, ?, ?)`,
      [userId, telegramUser.id, telegramUser.username || null, telegramUser.first_name || null, telegramUser.last_name || null]
    );
    userIdCache.set(telegramUser.id, { userId, expires: now + USER_ID_CACHE_TTL });
    return { id: userId, isNew: true };
  } finally {
    connection.release();
  }
}

// Получение состояния пользователя (data может быть объектом при колонке JSON или строкой при TEXT)
function parseStateData(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw !== 'string') return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Кэш состояний пользователей (короткий TTL для актуальности)
const userStateCache = new Map<number, { state: any; expires: number }>();
const USER_STATE_CACHE_TTL = 30 * 1000; // 30 секунд

async function getUserState(telegramId: number): Promise<any> {
  const now = Date.now();
  const cached = userStateCache.get(telegramId);
  if (cached && cached.expires > now) {
    return cached.state;
  }

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM user_bot_states WHERE telegram_id = ?', [telegramId]);
    let result = null;
    if ((rows as any[]).length > 0) {
      const row = (rows as any[])[0];
      result = { ...row, data: parseStateData(row.data) };
      userStateCache.set(telegramId, { state: result, expires: now + USER_STATE_CACHE_TTL });
    }
    return result;
  } finally {
    connection.release();
  }
}

// Сохранение состояния. Поддержка двух схем: id INT AUTO_INCREMENT (не передаём id) или id VARCHAR(36) (передаём UUID).
async function saveUserState(telegramId: number, state: string, data: any): Promise<void> {
  const connection = await getConnection();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const dataStr = JSON.stringify(data);
  try {
    // Сначала пробуем без id — для таблицы с id INT AUTO_INCREMENT и UNIQUE(telegram_id)
    try {
      await connection.execute(
        `INSERT INTO user_bot_states (telegram_id, state, data, expires_at) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE state = VALUES(state), data = VALUES(data), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
        [telegramId, state, dataStr, expiresAt]
      );
    } catch (err: any) {
      // Если id обязателен (VARCHAR(36) без default) — вставляем с UUID
      if (err?.code === 'ER_NO_DEFAULT_FOR_FIELD' && /'id'/.test(String(err?.sqlMessage || ''))) {
        await connection.execute(
          `INSERT INTO user_bot_states (id, telegram_id, state, data, expires_at) VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE state = VALUES(state), data = VALUES(data), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
          [crypto.randomUUID(), telegramId, state, dataStr, expiresAt]
        );
      } else {
        throw err;
      }
    }
    userStateCache.set(telegramId, { state: { state, data, expires_at: expiresAt }, expires: Date.now() + USER_STATE_CACHE_TTL });
  } finally {
    connection.release();
  }
}

// Очистка состояния
async function clearUserState(telegramId: number): Promise<void> {
  const connection = await getConnection();
  try {
    await connection.execute('DELETE FROM user_bot_states WHERE telegram_id = ?', [telegramId]);
    // Очищаем кэш
    userStateCache.delete(telegramId);
  } finally {
    connection.release();
  }
}

// Получение тарифов для пользователя. Если передан tariffIdForRenewal (продление) — показываем только этот тариф.
async function getPlans(telegramId?: number, tariffIdForRenewal?: string): Promise<any[]> {
  const connection = await getConnection();
  try {
    let tariffsToLoad: { id: string; name: string }[] = [];

    // Продление: показываем только тариф текущей активной подписки
    if (tariffIdForRenewal) {
      const [rows] = await connection.execute(
        'SELECT id, name FROM tariffs WHERE id = ?',
        [tariffIdForRenewal]
      );
      if ((rows as any[]).length > 0) {
        tariffsToLoad = rows as any[];
      }
    }

    if (tariffsToLoad.length === 0 && !tariffIdForRenewal) {
      let tariffIds: string[] = [];
      if (telegramId != null) {
        try {
          const [userRows] = await connection.execute(
            'SELECT id FROM users WHERE telegram_id = ?',
            [telegramId]
          );
          if ((userRows as any[]).length > 0) {
            const userId = (userRows as any[])[0].id;
            const [uatRows] = await connection.execute(
              'SELECT tariff_id FROM user_available_tariffs WHERE user_id = ?',
              [userId]
            );
            tariffIds = (uatRows as any[]).map((r: any) => r.tariff_id);
          }
        } catch (e) {
          // Таблица user_available_tariffs может не существовать (миграция не запущена) — используем тариф по умолчанию
        }
      }

      if (tariffIds.length > 0) {
        // Тарифы, закреплённые за пользователем — показываем даже неактивные (для старых пользователей)
        const placeholders = tariffIds.map(() => '?').join(',');
        const [rows] = await connection.execute(
          `SELECT id, name FROM tariffs WHERE id IN (${placeholders})`,
          tariffIds
        );
        tariffsToLoad = rows as any[];
      }

      if (tariffsToLoad.length === 0) {
        // Тариф по умолчанию (как на сайте)
        const [defaultRows] = await connection.execute(
          `SELECT id, name FROM tariffs WHERE is_active = 1 AND is_archived = 0 AND is_custom = 0 ORDER BY sort_order ASC, created_at DESC LIMIT 1`
        );
        if ((defaultRows as any[]).length === 0) return [];
        tariffsToLoad = defaultRows as any[];
      }
    }

    const plans: any[] = [];
    for (const tariff of tariffsToLoad) {
      const [priceRows] = await connection.execute(
        `SELECT id, period_months, monthly_price, is_popular FROM tariff_prices WHERE tariff_id = ? ORDER BY sort_order ASC, period_months ASC`,
        [tariff.id]
      );
      for (const row of priceRows as any[]) {
        const period = row.period_months;
        const monthlyPrice = parseFloat(row.monthly_price);
        const totalUsdt = monthlyPrice * period;
        const periodLabel = period === 1 ? '1 месяц' : period < 5 ? `${period} месяца` : `${period} месяцев`;
        plans.push({
          id: String(row.id),
          tariffId: String(tariff.id),
          tariffName: tariff.name,
          name: periodLabel,
          period,
          monthlyPriceUsdt: monthlyPrice,
          priceUsdt: totalUsdt,
          isPopular: Boolean(row.is_popular)
        });
      }
    }
    return plans;
  } finally {
    connection.release();
  }
}

// Название тарифа, закреплённого за пользователем (из активной подписки или user_available_tariffs)
async function getTariffNameForUser(userId: string): Promise<string> {
  const subscription = await getActiveSubscription(userId);
  if (subscription?.tariff_id) {
    const connection = await getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT name FROM tariffs WHERE id = ?',
        [subscription.tariff_id]
      );
      const name = (rows as any[])[0]?.name;
      return name ? String(name) : '';
    } finally {
      connection.release();
    }
  }
  const connection = await getConnection();
  try {
    const [uatRows] = await connection.execute(
      'SELECT tariff_id FROM user_available_tariffs WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const tariffId = (uatRows as any[])[0]?.tariff_id;
    if (!tariffId) return '';
    const [tRows] = await connection.execute(
      'SELECT name FROM tariffs WHERE id = ?',
      [tariffId]
    );
    const name = (tRows as any[])[0]?.name;
    return name ? String(name) : '';
  } catch {
    return '';
  } finally {
    connection.release();
  }
}

// Кэш активных подписок
const subscriptionCache = new Map<string, { subscription: any; expires: number }>();
const SUBSCRIPTION_CACHE_TTL = 60 * 1000; // 1 минута

// Получение активной подписки
async function getActiveSubscription(userId: string): Promise<any> {
  const now = Date.now();
  const cached = subscriptionCache.get(userId);
  if (cached && cached.expires > now) {
    return cached.subscription;
  }

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND end_date > NOW() ORDER BY end_date DESC LIMIT 1`,
      [userId]
    );
    const result = (rows as any[])[0] || null;
    subscriptionCache.set(userId, { subscription: result, expires: now + SUBSCRIPTION_CACHE_TTL });
    return result;
  } finally {
    connection.release();
  }
}

// Кэш данных пользователей
const userDataCache = new Map<number, { user: any; expires: number }>();
const USER_DATA_CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Получение данных пользователя
async function getUserData(telegramId: number): Promise<any> {
  const now = Date.now();
  const cached = userDataCache.get(telegramId);
  if (cached && cached.expires > now) {
    return cached.user;
  }

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    const result = (rows as any[])[0] || null;
    if (result) {
      userDataCache.set(telegramId, { user: result, expires: now + USER_DATA_CACHE_TTL });
    }
    return result;
  } finally {
    connection.release();
  }
}

// Discord OAuth URL
export function getDiscordOAuthUrl(telegramId: number): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/discord/callback`;
  const state = Buffer.from(JSON.stringify({ telegramId })).toString('base64');
  const params = new URLSearchParams({ client_id: clientId!, redirect_uri: redirectUri, response_type: 'code', scope: 'identify', state });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

// ============ КОМАНДЫ ============

export async function handleStart(message: any): Promise<void> {
  const chatId = message.chat.id;
  try {
    const { id: userId } = await getOrCreateUser(message.from);
    const subscription = await getActiveSubscription(userId);
    const endDate = subscription ? new Date(subscription.end_date).toLocaleDateString('ru-RU') : undefined;
    const welcomeKeyboardFromDb = await getBotButtons('welcome');
    const welcomeKeyboard = applySubscriptionLabelToWelcomeKeyboard(welcomeKeyboardFromDb, !!subscription) ?? getMainMenuKeyboard(!!subscription);
    await sendMessage(chatId, await messages.welcome(!!subscription, endDate), welcomeKeyboard);
  } catch (error) {
    console.error('Error in handleStart:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleAccount(message: any): Promise<void> {
  const chatId = message.chat.id;
  try {
    const { id: userId } = await getOrCreateUser(message.from);
    const user = await getUserData(message.from.id);
    const subscription = await getActiveSubscription(userId);
    
    let endDate, daysLeft;
    if (subscription) {
      const end = new Date(subscription.end_date);
      endDate = end.toLocaleDateString('ru-RU');
      daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    
    const tariffName = await getTariffNameForUser(userId);
    const discordOAuthUrl = getDiscordOAuthUrl(message.from.id);
    // Всегда используем функцию по умолчанию для account, так как она динамически формирует кнопки на основе состояния пользователя
    // Кнопки из БД статичны и не учитывают текущее состояние подключений
    const accountKeyboard = getAccountKeyboard({
      hasSubscription: !!subscription,
      discordConnected: !!user?.discord_id,
      emailConnected: !!user?.email,
      googleDriveConnected: !!user?.google_drive_email,
      discordOAuthUrl
    });
    await sendMessage(chatId, await messages.account({
      hasSubscription: !!subscription,
      endDate,
      daysLeft,
      tariffName,
      discordConnected: !!user?.discord_id,
      discordUsername: user?.discord_username,
      emailConnected: !!user?.email,
      email: user?.email,
      googleDriveConnected: !!user?.google_drive_email,
      googleDriveEmail: user?.google_drive_email
    }), accountKeyboard);
  } catch (error) {
    console.error('Error in handleAccount:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleStatus(message: any): Promise<void> {
  const chatId = message.chat.id;
  try {
    const { id: userId } = await getOrCreateUser(message.from);
    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      await sendMessage(chatId, await messages.subscriptionStatus(false), getBackToMainKeyboard());
      return;
    }
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    await sendMessage(chatId, await messages.subscriptionStatus(true, endDate.toLocaleDateString('ru-RU'), daysLeft), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleStatus:', error);
    await sendMessage(chatId, await messages.error());
  }
}

// Общая функция для загрузки ссылок на поддержку
async function loadSupportLinks(): Promise<{ supportTg1: string; supportTg2: string }> {
  const connection = await getConnection();
  let supportTg1 = '';
  let supportTg2 = '';
  
  try {
    const [rows] = await connection.execute(
      `SELECT \`key\`, value FROM site_contact_links WHERE \`key\` IN ('support_tg_1', 'support_tg_2')`
    );
    
    const linksMap: Record<string, string> = {};
    for (const row of rows as any[]) {
      linksMap[row.key] = row.value || '';
    }
    
    supportTg1 = (linksMap.support_tg_1 || '').trim().replace(/^@/, '');
    supportTg2 = (linksMap.support_tg_2 || '').trim().replace(/^@/, '');
    
    console.log(`[Telegram Bot] Loaded support links:`, { supportTg1, supportTg2 });
  } catch (dbError) {
    console.error('[Telegram Bot] Error loading support links:', dbError);
    // Используем значения по умолчанию
    supportTg1 = 'kirjeyy';
    supportTg2 = 'ascys';
  } finally {
    connection.release();
  }
  
  // Если ссылки не заданы, используем значения по умолчанию
  if (!supportTg1) supportTg1 = 'kirjeyy';
  if (!supportTg2) supportTg2 = 'ascys';
  
  return { supportTg1, supportTg2 };
}

// Формирование текста и клавиатуры помощи
async function getHelpContent(supportTg1: string, supportTg2: string): Promise<{ text: string; keyboard: any }> {
  const supportText = supportTg1 && supportTg2 
    ? `@${supportTg1} или @${supportTg2}`
    : supportTg1 
    ? `@${supportTg1}`
    : supportTg2
    ? `@${supportTg2}`
    : 'в поддержку';
  
  const helpText = await messages.help(supportText);
  
  // Формируем параметры для замены плейсхолдеров в кнопках
  const helpParams: Record<string, string> = {
    supportText
  };
  if (supportTg1) {
    helpParams.supportTg1 = supportTg1; // Без @ для URL
  }
  if (supportTg2) {
    helpParams.supportTg2 = supportTg2; // Без @ для URL
  }
  
  console.log(`[Telegram Bot] Help params:`, helpParams);
  console.log(`[Telegram Bot] Support usernames:`, { supportTg1, supportTg2 });
  
  // Пытаемся загрузить кнопки из БД
  const helpKeyboardFromDb = await getBotButtons('help', helpParams);
  console.log(`[Telegram Bot] Help keyboard from DB:`, JSON.stringify(helpKeyboardFromDb));
  
  // Всегда используем функцию по умолчанию, так как она гарантированно содержит кнопки поддержки
  // Кнопки из БД могут не содержать правильных плейсхолдеров или быть пустыми
  console.log(`[Telegram Bot] Using default help keyboard with support links`);
  const helpKeyboard = getHelpKeyboard(supportTg1, supportTg2);
  
  // Если есть кнопки из БД и они валидные, можно их использовать, но только если они содержат кнопки поддержки
  // Пока используем всегда функцию по умолчанию для гарантии
  
  console.log(`[Telegram Bot] Final help keyboard:`, JSON.stringify(helpKeyboard));
  console.log(`[Telegram Bot] Help keyboard buttons count:`, helpKeyboard.inline_keyboard?.length || 0);
  
  return { text: helpText, keyboard: helpKeyboard };
}

export async function handleHelp(message: any): Promise<void> {
  const chatId = message.chat.id;
  try {
    const { supportTg1, supportTg2 } = await loadSupportLinks();
    const { text: helpText, keyboard: helpKeyboard } = await getHelpContent(supportTg1, supportTg2);
    await sendMessage(chatId, helpText, helpKeyboard);
  } catch (error) {
    console.error('[Telegram Bot] Error in handleHelp:', error);
    await sendMessage(chatId, await messages.help('в поддержку'), getBackToMainKeyboard());
  }
}

export async function handleHelpCallback(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleHelpCallback called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    const { supportTg1, supportTg2 } = await loadSupportLinks();
    const { text: helpText, keyboard: helpKeyboard } = await getHelpContent(supportTg1, supportTg2);
    
    try {
      const editResult = await editMessage(chatId, messageId, helpText, helpKeyboard);
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      // Если не удалось отредактировать, отправляем новое сообщение
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, helpText, helpKeyboard);
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleHelpCallback:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

// ============ CALLBACKS ============

export async function handleBackToMain(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleBackToMain called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    await clearUserState(telegramId);
    const { id: userId } = await getOrCreateUser(callbackQuery.from);
    const subscription = await getActiveSubscription(userId);
    const endDate = subscription ? new Date(subscription.end_date).toLocaleDateString('ru-RU') : undefined;
    const welcomeText = await messages.welcome(!!subscription, endDate);
    const welcomeKeyboardFromDb = await getBotButtons('welcome');
    const welcomeKeyboard = applySubscriptionLabelToWelcomeKeyboard(welcomeKeyboardFromDb, !!subscription) ?? getMainMenuKeyboard(!!subscription);
    
    console.log(`[Telegram Bot] Welcome text length: ${welcomeText.length}`);
    console.log(`[Telegram Bot] Welcome keyboard from DB:`, JSON.stringify(welcomeKeyboardFromDb));
    console.log(`[Telegram Bot] Final welcome keyboard:`, JSON.stringify(welcomeKeyboard));
    
    try {
      const editResult = await editMessage(chatId, messageId, welcomeText, welcomeKeyboard);
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      // Если не удалось отредактировать, отправляем новое сообщение
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, welcomeText, welcomeKeyboard);
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleBackToMain:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handleBuySubscription(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from?.id;
  try {
    await answerCallback(callbackQuery.id);
    if (telegramId) {
      const blocked = await isTelegramBlockedForSubscription(telegramId, callbackQuery.from?.username);
      if (blocked) {
        await editMessage(chatId, messageId, '❌ Покупка подписки для этого аккаунта запрещена. Обратитесь в поддержку.', getBackToMainKeyboard());
        return;
      }
    }
    // При продлении показываем только тариф текущей активной подписки
    let tariffIdForRenewal: string | undefined;
    if (telegramId) {
      const { id: userId } = await getOrCreateUser(callbackQuery.from);
      const subscription = await getActiveSubscription(userId);
      if (subscription?.tariff_id) {
        tariffIdForRenewal = String(subscription.tariff_id);
      }
    }
    const plans = await getPlans(telegramId, tariffIdForRenewal);
    if (plans.length === 0) {
      await editMessage(chatId, messageId, '❌ Тарифы временно недоступны.', getBackToMainKeyboard());
      return;
    }
    await editMessage(chatId, messageId, await messages.selectPlan(plans), getPlanKeyboard(plans));
  } catch (error) {
    console.error('Error in handleBuySubscription:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleSelectPlan(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  const rawData = callbackQuery.data || '';
  const planId = String(rawData.split(':')[1] || '').trim();
  console.log('[Telegram Bot] handleSelectPlan: telegramId=%s planId=%s rawData=%s', telegramId, planId, rawData);
  try {
    await answerCallback(callbackQuery.id);
    // При продлении подписки показываем планы того же тарифа (в т.ч. архивного), иначе выбранный план не найдётся
    let tariffIdForRenewal: string | undefined;
    try {
      const { id: userId } = await getOrCreateUser(callbackQuery.from);
      const subscription = await getActiveSubscription(userId);
      if (subscription?.tariff_id) tariffIdForRenewal = String(subscription.tariff_id);
    } catch (_) {
      // игнорируем — без userId просто загрузим планы по умолчанию
    }
    const plans = await getPlans(telegramId, tariffIdForRenewal);
    console.log('[Telegram Bot] handleSelectPlan: got plans count=%s ids=%s', plans.length, plans.map((p: any) => p.id).join(','));
    const plan = plans.find((p: any) => String(p.id) === planId);
    if (!plan) {
      console.warn('[Telegram Bot] handleSelectPlan: plan not found for planId=%s', planId);
      await editMessage(chatId, messageId, '❌ Тариф не найден.', getBackToMainKeyboard());
      return;
    }
    const user = await getUserData(telegramId);
    const stateData = {
      planId: String(plan.id),
      tariffId: String(plan.tariffId),
      planName: plan.tariffName ? `${plan.tariffName}, ${plan.name}` : plan.name,
      period: Number(plan.period),
      priceUsdt: Number(plan.priceUsdt),
      discordId: user?.discord_id ?? null,
      discordUsername: user?.discord_username ?? null,
      email: user?.email ?? null
    };
    await saveUserState(telegramId, 'selecting_plan', stateData);
    const state = await getUserState(telegramId);
    const needsDiscord = !user?.discord_id;
    const needsNotionEmail = !user?.email;
    const needsGoogleDriveEmail = !user?.google_drive_email;
    const hasPromocode = !!state?.data?.promocode;
    const finalPrice = Number(state?.data?.priceUsdt ?? plan.priceUsdt);
    const confirmText = await messages.confirmOrder({
      planName: plan.tariffName ? `${plan.tariffName} — ${plan.name}` : plan.name,
      period: plan.period,
      priceUsdt: Number.isFinite(finalPrice) ? finalPrice : plan.priceUsdt,
      discordUsername: user?.discord_username,
      email: user?.email,
      googleDriveEmail: user?.google_drive_email,
      promocode: state?.data?.promocode,
      originalPrice: state?.data?.originalPrice,
      discountPercent: state?.data?.discountPercent,
      discountType: state?.data?.discountType,
      discountAmount: state?.data?.discountAmount
    });
    const keyboard = getConfirmKeyboard(needsDiscord, needsNotionEmail, needsGoogleDriveEmail, getDiscordOAuthUrl(telegramId), hasPromocode);
    try {
      await editMessage(chatId, messageId, confirmText, keyboard);
    } catch (editErr: any) {
      const desc = String(editErr?.description ?? editErr?.message ?? '');
      if (editErr?.error_code === 400 || /message.*(not modified|to edit not found|cant be edited)/i.test(desc)) {
        console.log('[Telegram Bot] handleSelectPlan: editMessage failed, sending new message:', desc);
        await sendMessage(chatId, confirmText, keyboard);
      } else {
        throw editErr;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleSelectPlan:', error?.message ?? error);
    console.error('[Telegram Bot] handleSelectPlan stack:', error?.stack);
    if (error?.cause) console.error('[Telegram Bot] handleSelectPlan cause:', error.cause);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendErr) {
      console.error('[Telegram Bot] Failed to send error message:', sendErr);
    }
  }
}

export async function handleEnterEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const state = await getUserState(telegramId);
    await saveUserState(telegramId, 'entering_email', state?.data || {});
    await editMessage(chatId, messageId, await messages.askEmail(), getEmailInputKeyboard());
  } catch (error) {
    console.error('Error in handleEnterEmail:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleEmailInput(message: any): Promise<void> {
  const chatId = message.chat.id;
  const telegramId = message.from.id;
  const email = message.text.trim().toLowerCase();
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sendMessage(chatId, await messages.invalidEmail(), getEmailInputKeyboard());
      return;
    }
    const emailBlocked = await isBlocked('email', email);
    if (emailBlocked) {
      await sendMessage(chatId, '❌ Подключение этой почты запрещено. Если вы считаете, что это ошибка — обратитесь в поддержку.', getEmailInputKeyboard());
      await notifyAdminBlockedAttempt('email', email, telegramId, message.from?.username);
      return;
    }
    const userBefore = await getUserData(telegramId);
    const oldEmail = userBefore?.email?.trim() || null;
    const connection = await getConnection();
    try {
      await connection.execute('UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?', [email, telegramId]);
      // Инвалидируем кэш данных пользователя
      userDataCache.delete(telegramId);
    } finally {
      connection.release();
    }
    // Уведомление админу только если у пользователя есть активная подписка — тогда нужно выдать/обновить доступ к Notion
    if (oldEmail !== email) {
      let hasActiveSubscription = false;
      try {
        const { id: userId } = await getOrCreateUser(message.from);
        const subscription = await getActiveSubscription(userId);
        hasActiveSubscription = !!subscription;
      } catch (_) {
        // игнорируем ошибки при проверке подписки
      }
      if (hasActiveSubscription) {
        const userLabel = message.from?.username ? `@${message.from.username}` : message.from?.first_name || `ID: ${telegramId}`;
        const fromTo = oldEmail ? `с \`${oldEmail}\` на \`${email}\`` : `указана почта: \`${email}\``;
        const adminMsg = `📧 *Notion: смена почты в боте*\n\nПользователь ${userLabel} (TG ID: \`${telegramId}\`) ${oldEmail ? 'поменял' : 'указал'} почту для Notion: ${fromTo}`;
        sendTelegramMessageToAll(adminMsg).catch((e) => console.error('Failed to send admin Notion email change notification:', e));
      }
    }
    const state = await getUserState(telegramId);
    if (state?.state === 'entering_email' && state.data?.planId) {
      const user = await getUserData(telegramId);
      const needsDiscord = !user?.discord_id;
      const needsGoogleDriveEmail = !user?.google_drive_email;
      await saveUserState(telegramId, 'selecting_plan', { ...state.data, email });
      const hasPromocode = !!state.data?.promocode;
      const finalPrice = state.data.priceUsdt || state.data.originalPrice;
      await sendMessage(chatId, await messages.confirmOrder({
        planName: state.data.planName,
        period: state.data.period,
        priceUsdt: finalPrice,
        discordUsername: user?.discord_username,
        email,
        googleDriveEmail: user?.google_drive_email,
        promocode: state.data?.promocode,
        originalPrice: state.data?.originalPrice,
        discountPercent: state.data?.discountPercent,
        discountType: state.data?.discountType,
        discountAmount: state.data?.discountAmount
      }), getConfirmKeyboard(needsDiscord, false, needsGoogleDriveEmail, getDiscordOAuthUrl(telegramId), hasPromocode));
    } else {
      await clearUserState(telegramId);
      await sendMessage(chatId, `✅ Email сохранён: <code>${email}</code>`, getBackToMainKeyboard());
    }
  } catch (error) {
    console.error('Error in handleEmailInput:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleEnterPromocode(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleEnterPromocode called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    const state = await getUserState(telegramId);
    await saveUserState(telegramId, 'entering_promocode', state?.data || {});
    
    let promocodeText = await messages.askPromocode();
    console.log(`[Telegram Bot] Promocode text from messages.askPromocode():`, promocodeText);
    console.log(`[Telegram Bot] Promocode text length:`, promocodeText?.length || 0);
    console.log(`[Telegram Bot] Promocode text trimmed length:`, promocodeText?.trim()?.length || 0);
    
    // Гарантируем, что текст не пустой
    if (!promocodeText || !promocodeText.trim()) {
      promocodeText = '🎫 <b>Введите промокод</b>\n\nВведите код промокода для получения скидки на подписку.\n\nИли отправьте "отмена" для отмены.';
      console.log(`[Telegram Bot] Using fallback promocode text:`, promocodeText);
    } else {
      console.log(`[Telegram Bot] Using text from DB/defaults:`, promocodeText.substring(0, 150));
    }
    
    // Финальная проверка перед отправкой
    if (!promocodeText || !promocodeText.trim()) {
      console.error(`[Telegram Bot] ERROR: Promocode text is still empty after fallback!`);
      promocodeText = '🎫 <b>Введите промокод</b>\n\nВведите код промокода для получения скидки на подписку.\n\nИли отправьте "отмена" для отмены.';
    }
    
    const promocodeKeyboardFromDb = await getBotButtons('askPromocode');
    console.log(`[Telegram Bot] Promocode keyboard from DB:`, JSON.stringify(promocodeKeyboardFromDb));
    
    const promocodeKeyboard = promocodeKeyboardFromDb ?? getEmailInputKeyboard();
    console.log(`[Telegram Bot] Final promocode keyboard:`, JSON.stringify(promocodeKeyboard));
    console.log(`[Telegram Bot] Promocode text to send:`, promocodeText.substring(0, 100));
    
    try {
      const editResult = await editMessage(chatId, messageId, promocodeText, promocodeKeyboard);
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      // Если не удалось отредактировать, отправляем новое сообщение
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, promocodeText, promocodeKeyboard);
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleEnterPromocode:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handlePromocodeInput(message: any): Promise<void> {
  const chatId = message.chat.id;
  const telegramId = message.from.id;
  const promocodeText = message.text.trim().toUpperCase();
  
  try {
    if (promocodeText.toLowerCase() === 'отмена' || promocodeText.toLowerCase() === 'cancel') {
      const state = await getUserState(telegramId);
      await saveUserState(telegramId, 'selecting_plan', state?.data || {});
      const user = await getUserData(telegramId);
      const needsDiscord = !user?.discord_id;
      const needsNotionEmail = !user?.email;
      const needsGoogleDriveEmail = !user?.google_drive_email;
      await sendMessage(chatId, '❌ Ввод промокода отменён.', getConfirmKeyboard(needsDiscord, needsNotionEmail, needsGoogleDriveEmail, getDiscordOAuthUrl(telegramId), false));
      return;
    }
    
    const state = await getUserState(telegramId);
    if (!state?.data?.planId || !state.data.priceUsdt) {
      await sendMessage(chatId, await messages.error(), getBackToMainKeyboard());
      return;
    }
    
    const user = await getUserData(telegramId);
    const telegramUsername = user?.telegram_username || message.from.username;
    
    // Проверяем промокод через API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const checkResponse = await fetch(`${baseUrl}/api/promocodes/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: promocodeText,
        telegramUsername: telegramUsername,
        amount: state.data.priceUsdt,
        periodMonths: state.data.period,
        tariffId: state.data.tariffId
      }),
      signal: AbortSignal.timeout(INTERNAL_API_TIMEOUT_MS)
    });
    
    const checkData = await checkResponse.json();
    
    if (!checkData.valid) {
      const needsDiscord = !user?.discord_id;
      const needsNotionEmail = !user?.email;
      const needsGoogleDriveEmail = !user?.google_drive_email;
      const keyboard = getConfirmKeyboard(needsDiscord, needsNotionEmail, needsGoogleDriveEmail, getDiscordOAuthUrl(telegramId), true);
      await sendMessage(
        chatId,
        `❌ ${checkData.error || 'Промокод недействителен'}. Вы можете ввести другой промокод или продолжить оплату без скидки.`,
        keyboard
      );
      return;
    }
    
    // Если промокод присваивает другой тариф — подставляем его в состояние
    const hasOverrideTariff = checkData.promocode.override_tariff_id && checkData.promocode.override_tariff_price_id && checkData.promocode.override_plan_name;
    const updatedState = {
      ...state.data,
      ...(hasOverrideTariff ? {
        tariffId: checkData.promocode.override_tariff_id,
        planId: checkData.promocode.override_tariff_price_id,
        planName: checkData.promocode.override_plan_name,
        originalPrice: Number(checkData.promocode.original_amount)
      } : { originalPrice: state.data.priceUsdt }),
      promocode: checkData.promocode.code,
      promocodeId: checkData.promocode.id,
      priceUsdt: checkData.promocode.final_amount,
      discountAmount: checkData.promocode.discount_amount,
      discountPercent: checkData.promocode.discount_percent,
      discountType: checkData.promocode.discount_type === 'fixed' ? 'fixed' : 'percent',
      extraDays: checkData.promocode.extra_days || 0
    };
    
    await saveUserState(telegramId, 'selecting_plan', updatedState);
    
    const needsDiscord = !user?.discord_id;
    const needsNotionEmail = !user?.email;
    const needsGoogleDriveEmail = !user?.google_drive_email;

    // Вступление + полный блок подтверждения заказа (как на экране подтверждения), включая данные о промокоде и скидке
    const planNameForConfirm = hasOverrideTariff ? checkData.promocode.override_plan_name : (state.data.planName || 'Подписка');
    const introText = hasOverrideTariff
      ? `По промокоду вам предоставляется тариф: <b>${String(checkData.promocode.override_tariff_name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</b>.\n\nПожалуйста, проверьте корректность подключений — после оплаты доступы будут выданы на данные, указанные ниже.\n\nЕсли всё верно, можете перейти к оплате.\n\n`
      : 'Пожалуйста, проверьте корректность подключений — после оплаты доступы будут выданы на данные, указанные ниже.\n\nЕсли всё верно, можете перейти к оплате.\n\n';
    const confirmText = await messages.confirmOrder({
      planName: planNameForConfirm,
      period: state.data.period ?? 1,
      priceUsdt: checkData.promocode.final_amount,
      discordUsername: user?.discord_username,
      email: user?.email,
      googleDriveEmail: user?.google_drive_email,
      promocode: checkData.promocode.code,
      originalPrice: Number(hasOverrideTariff ? checkData.promocode.original_amount : state.data.priceUsdt),
      discountPercent: checkData.promocode.discount_percent,
      discountType: checkData.promocode.discount_type === 'fixed' ? 'fixed' : 'percent',
      discountAmount: checkData.promocode.discount_amount
    });
    let fullMessage = introText + confirmText;
    if (checkData.promocode.extra_days && checkData.promocode.extra_days > 0) {
      fullMessage += `\n\n🎁 Бонус: +${checkData.promocode.extra_days} дней к подписке`;
    }

    await sendMessage(chatId, fullMessage, getConfirmKeyboard(needsDiscord, needsNotionEmail, needsGoogleDriveEmail, getDiscordOAuthUrl(telegramId), true));
  } catch (error) {
    console.error('Error in handlePromocodeInput:', error);
    const state = await getUserState(telegramId).catch(() => null);
    const user = state ? await getUserData(telegramId).catch(() => null) : null;
    const needsDiscord = !user?.discord_id;
    const needsNotionEmail = !user?.email;
    const needsGoogleDriveEmail = !user?.google_drive_email;
    const keyboard = getConfirmKeyboard(needsDiscord, needsNotionEmail, needsGoogleDriveEmail, getDiscordOAuthUrl(telegramId), true);
    await sendMessage(
      chatId,
      '❌ Ошибка проверки промокода. Попробуйте ввести промокод снова или продолжить оплату без скидки.',
      keyboard
    );
  }
}

export async function handleConfirmOrder(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const state = await getUserState(telegramId);
    const user = await getUserData(telegramId);
    if (!user?.discord_id || !user?.email || !user?.google_drive_email) {
      await answerCallback(callbackQuery.id, '⚠️ Заполните Discord, Email (Notion) и Email (Google Drive)');
      return;
    }
    if (!state?.data?.planId) {
      await editMessage(chatId, messageId, await messages.error(), getBackToMainKeyboard());
      return;
    }
    const connection = await getConnection();
    try {
      const { id: userId } = await getOrCreateUser(callbackQuery.from);
      const activeSubscription = await getActiveSubscription(userId);
      const isRenewal = !!activeSubscription;
      const subscriptionId = isRenewal ? activeSubscription.id : crypto.randomUUID();
      const paymentId = crypto.randomUUID();
      const amount = Number(state.data.priceUsdt);
      const originalAmount = state.data.originalPrice ? Number(state.data.originalPrice) : amount;
      const promocodeId = state.data.promocodeId || null;
      const promocodeCode = state.data.promocode || null;

      if (!isRenewal) {
        // Новая покупка: создаём новую подписку
        await connection.execute(
          `INSERT INTO subscriptions (id, user_id, tariff_id, tariff_price_id, period_months, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [subscriptionId, userId, state.data.tariffId || null, state.data.planId, state.data.period, originalAmount, 'USDT']
        );
      }
      // Колонки промокода в payments (использование записывается только после успешной оплаты в webhook)
      try {
        await connection.execute(`ALTER TABLE payments ADD COLUMN promocode_id VARCHAR(36) NULL`);
      } catch (e: any) {
        if (!e.message?.includes('Duplicate column name')) throw e;
      }
      try {
        await connection.execute(`ALTER TABLE payments ADD COLUMN promocode_original_amount DECIMAL(10,2) NULL`);
      } catch (e: any) {
        if (!e.message?.includes('Duplicate column name')) throw e;
      }
      try {
        await connection.execute(`ALTER TABLE payments ADD COLUMN promocode_discount_amount DECIMAL(10,2) NULL`);
      } catch (e: any) {
        if (!e.message?.includes('Duplicate column name')) throw e;
      }
      const discountAmount = promocodeId && state.data.discountAmount != null ? Number(state.data.discountAmount) : (originalAmount - amount);
      await connection.execute(
        `INSERT INTO payments (id, subscription_id, user_id, amount, currency, status, payment_method, promocode_id, promocode_original_amount, promocode_discount_amount) VALUES (?, ?, ?, ?, ?, 'pending', 'crypto', ?, ?, ?)`,
        [paymentId, subscriptionId, userId, amount, 'USDT', promocodeId, promocodeId ? originalAmount : null, promocodeId ? discountAmount : null]
      );

      // Создаём инвойс NOWPayments (сумма в USDT как на сайте)
      let invoiceUrl: string | undefined;
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const payCurrency = process.env.NOWPAYMENTS_PAY_CURRENCY || 'usdtarb';
        const invoice = await nowPayments.createInvoice({
          price_amount: amount,
          price_currency: payCurrency,
          pay_currency: payCurrency,
          ipn_callback_url: `${baseUrl}/api/nowpayments/webhook`,
          order_id: `SUB-${subscriptionId.slice(0, 8)}`,
          order_description: 'Afina DAO Subscription',
          success_url: `${baseUrl}/payment/success?subscription=${subscriptionId}`,
          cancel_url: `${baseUrl}/payment/cancel?subscription=${subscriptionId}`,
        });
        invoiceUrl = invoice.invoice_url;
        const orderId = `SUB-${subscriptionId.slice(0, 8)}`;
        await connection.execute(
          `UPDATE payments SET external_id = ?, provider_data = ?, updated_at = NOW() WHERE id = ?`,
          [
            String(invoice.id),
            JSON.stringify({
              invoice_id: invoice.id,
              invoice_url: invoice.invoice_url,
              order_id: orderId,
              pay_currency: payCurrency,
              created_at: invoice.created_at,
              period_months: state.data.period != null ? Number(state.data.period) : undefined,
            }),
            paymentId,
          ]
        );
        await connection.execute(
          `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details) VALUES (?, ?, ?, 'nowpayments_invoice_created', ?)`,
          [
            crypto.randomUUID(),
            userId,
            subscriptionId,
            JSON.stringify({ invoice_id: invoice.id, invoice_url: invoice.invoice_url, amount, pay_currency: payCurrency }),
          ]
        );
      } catch (invoiceErr) {
        console.error('Error creating NOWPayments invoice in bot:', invoiceErr);
      }

      await saveUserState(telegramId, 'awaiting_payment', { ...state.data, subscriptionId, paymentId });
      await editMessage(
        chatId,
        messageId,
        await messages.awaitingPayment(state.data.priceUsdt, invoiceUrl),
        getPaymentKeyboard(invoiceUrl)
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in handleConfirmOrder:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleRefreshAccess(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    const state = await getUserState(telegramId);
    // На экране подтверждения заказа — обновляем отображаемые данные подключений (Discord, Email), а не выдаём доступы
    if (state?.state === 'selecting_plan' && state?.data?.planId) {
      await answerCallback(callbackQuery.id, '🔄 Обновляю данные подключений...');
      await deleteMessage(chatId, messageId);
      userDataCache.delete(telegramId);
      const user = await getUserData(telegramId);
      const needsDiscord = !user?.discord_id;
      const needsNotionEmail = !user?.email;
      const needsGoogleDriveEmail = !user?.google_drive_email;
      const hasPromocode = !!state.data?.promocode;
      const finalPrice = Number(state.data?.priceUsdt ?? 0);
      const confirmText = await messages.confirmOrder({
        planName: state.data.planName || 'Подписка',
        period: state.data.period ?? 1,
        priceUsdt: Number.isFinite(finalPrice) ? finalPrice : 0,
        discordUsername: user?.discord_username,
        email: user?.email,
        googleDriveEmail: user?.google_drive_email,
        promocode: state.data.promocode,
        originalPrice: state.data.originalPrice,
        discountPercent: state.data.discountPercent,
        discountType: state.data.discountType,
        discountAmount: state.data.discountAmount
      });
      const keyboard = getConfirmKeyboard(needsDiscord, needsNotionEmail, needsGoogleDriveEmail, getDiscordOAuthUrl(telegramId), hasPromocode);
      await sendMessage(chatId, confirmText, keyboard);
      return;
    }
    // Уже купил подписку — обновляем выданные доступы (Notion, Google Drive, Discord)
    await answerCallback(callbackQuery.id, '🔄 Обновляю доступ...');
    const { id: userId } = await getOrCreateUser(callbackQuery.from);
    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      await sendMessage(chatId, '⚠️ У вас нет активной подписки. Обновление доступа доступно после оплаты.', getBackToMainKeyboard());
      return;
    }
    const user = await getUserData(telegramId);
    const connection = await getConnection();
    const results: { notion?: boolean; googleDrive?: boolean } = {};
    try {
      if (user?.email) {
        try {
          const { grantAccess } = await import('@/lib/notion');
          const result = await grantAccess(user.email, userId, subscription.id);
          results.notion = result.success;
          if (result.success) {
            await connection.execute(
              `UPDATE subscriptions SET notion_access_granted = TRUE WHERE id = ?`,
              [subscription.id]
            );
          }
        } catch (e: any) {
          results.notion = false;
          console.error('[Telegram Bot] Notion grant error:', e);
        }
      }
      if (user?.google_drive_email) {
        try {
          const { grantAccess } = await import('@/lib/google-drive');
          const result = await grantAccess(user.google_drive_email, userId, subscription.id);
          results.googleDrive = result.success;
          if (result.success) {
            try {
              await connection.execute(
                `UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?`,
                [subscription.id]
              );
            } catch (e: any) {
              if (e?.code === 'ER_BAD_FIELD_ERROR') {
                await connection.execute('ALTER TABLE subscriptions ADD COLUMN google_drive_access_granted BOOLEAN DEFAULT FALSE');
                await connection.execute('UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?', [subscription.id]);
              }
            }
          }
        } catch (e: any) {
          results.googleDrive = false;
          console.error('[Telegram Bot] Google Drive grant error:', e);
        }
      }
    } finally {
      connection.release();
    }
    const lines: string[] = ['✅ Доступ обновлён.'];
    if (results.notion === true) lines.push('• Notion: приглашение отправлено на почту');
    else if (user?.email && results.notion === false) lines.push('• Notion: ошибка (проверьте почту или обратитесь в поддержку)');
    if (results.googleDrive === true) lines.push('• Google Drive: доступ выдан');
    else if (user?.google_drive_email && results.googleDrive === false) lines.push('• Google Drive: ошибка (обратитесь в поддержку)');
    await sendMessage(chatId, lines.join('\n'), getBackToMainKeyboard());
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleRefreshAccess:', error);
    await sendMessage(chatId, await messages.error()).catch(() => {});
  }
}

export async function handleHowToStartCommunity(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const user = await getUserData(telegramId);
    const text = await messages.howToStartInCommunity(user?.email);
    const discordInvite = process.env.DISCORD_INVITE_URL;
    const keyboard = discordInvite
      ? { inline_keyboard: [[{ text: '🎮 Перейти в Discord', url: discordInvite }], [{ text: '🏠 Главное меню', callback_data: 'back_to_main' }]] }
      : getBackToMainKeyboard();
    await sendMessage(chatId, text, keyboard);
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleHowToStartCommunity:', error);
    await sendMessage(chatId, await messages.error()).catch(() => {});
  }
}

export async function handleProcessPayment(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id, '💳 Обработка...');
    const state = await getUserState(telegramId);
    if (!state || state.state !== 'awaiting_payment') {
      await sendMessage(chatId, await messages.error());
      return;
    }
    const connection = await getConnection();
    try {
      const now = new Date();
      const periodMonths = Math.max(1, Math.min(120, Math.floor(Number(state.data.period) || 1)));
      const endDate = addMonths(now, periodMonths);
      await connection.execute(`UPDATE subscriptions SET status = 'active', start_date = ?, end_date = ? WHERE id = ?`, [now, endDate, state.data.subscriptionId]);
      await connection.execute(`UPDATE payments SET status = 'completed', paid_at = CURRENT_TIMESTAMP WHERE id = ?`, [state.data.paymentId]);
      const [subRows] = await connection.execute(
        'SELECT user_id, tariff_id FROM subscriptions WHERE id = ?',
        [state.data.subscriptionId]
      );
      const sub = (subRows as any[])[0];
      if (sub?.tariff_id) {
        try {
          await connection.execute('DELETE FROM user_available_tariffs WHERE user_id = ?', [sub.user_id]);
          await connection.execute(
            'INSERT INTO user_available_tariffs (id, user_id, tariff_id) VALUES (?, ?, ?)',
            [crypto.randomUUID(), sub.user_id, sub.tariff_id]
          );
        } catch (e) {
          console.error('[Telegram Bot] Error syncing user_available_tariffs:', e);
        }
      }
      await clearUserState(telegramId);
      let communityUrl = (process.env.DISCORD_INVITE_URL || '').trim();
      try {
        const [linkRows] = await connection.execute(
          `SELECT \`key\`, value FROM site_contact_links WHERE \`key\` IN ('community_button_url', 'discord_invite_url')`
        );
        const linkMap: Record<string, string> = {};
        for (const row of linkRows as { key: string; value: string | null }[]) {
          linkMap[row.key] = (row.value ?? '').trim();
        }
        communityUrl = (linkMap.community_button_url || linkMap.discord_invite_url || process.env.DISCORD_INVITE_URL || '').trim();
      } catch {
        // уже есть fallback выше
      }
      await editMessage(chatId, messageId, await messages.paymentSuccess(), getSuccessKeyboard(communityUrl));
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in handleProcessPayment:', error);
    await sendMessage(chatId, await messages.paymentFailed());
  }
}

export async function handleCancel(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await clearUserState(callbackQuery.from.id);
    await editMessage(chatId, messageId, await messages.cancelled(), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleCancel:', error);
  }
}

export async function handleSocials(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleSocials called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    // Загружаем ссылки из БД
    const connection = await getConnection();
    let telegramChannelUrl = '';
    let discordInviteUrl = '';
    
    try {
      const [rows] = await connection.execute(
        `SELECT \`key\`, value FROM site_contact_links WHERE \`key\` IN ('telegram_channel_url', 'discord_invite_url')`
      );
      
      console.log(`[Telegram Bot] Raw contact links from DB:`, rows);
      
      const linksMap: Record<string, string> = {};
      for (const row of rows as any[]) {
        linksMap[row.key] = row.value || '';
      }
      
      telegramChannelUrl = (linksMap.telegram_channel_url || '').trim();
      discordInviteUrl = (linksMap.discord_invite_url || '').trim();
      
      console.log(`[Telegram Bot] Loaded contact links:`, { telegramChannelUrl, discordInviteUrl });
    } catch (dbError) {
      console.error('[Telegram Bot] Error loading contact links:', dbError);
      // Используем значения по умолчанию
      telegramChannelUrl = 'https://t.me/afina_dao';
      discordInviteUrl = process.env.DISCORD_INVITE_URL || 'https://discord.gg/afinadao';
    } finally {
      connection.release();
    }
    
    // Если ссылки не заданы, используем значения по умолчанию
    if (!telegramChannelUrl) {
      telegramChannelUrl = 'https://t.me/afina_dao';
    }
    if (!discordInviteUrl) {
      discordInviteUrl = process.env.DISCORD_INVITE_URL || 'https://discord.gg/afinadao';
    }
    
    console.log(`[Telegram Bot] Final contact links:`, { telegramChannelUrl, discordInviteUrl });
    
    const socialsText = await messages.socials();
    
    // Создаем клавиатуру с ссылками из БД
    const socialsParams = { 
      discordInviteUrl,
      telegramChannelUrl 
    };
    console.log(`[Telegram Bot] Socials params for getBotButtons:`, socialsParams);
    
    const socialsKeyboardFromDb = await getBotButtons('socials', socialsParams);
    console.log(`[Telegram Bot] Socials keyboard from DB:`, JSON.stringify(socialsKeyboardFromDb));
    
    const socialsKeyboard = socialsKeyboardFromDb ?? getSocialsKeyboard(telegramChannelUrl, discordInviteUrl);
    
    console.log(`[Telegram Bot] Socials text length: ${socialsText.length}`);
    console.log(`[Telegram Bot] Final socials keyboard:`, JSON.stringify(socialsKeyboard));
    
    try {
      const editResult = await editMessage(chatId, messageId, socialsText, socialsKeyboard);
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      // Если не удалось отредактировать, отправляем новое сообщение
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, socialsText, socialsKeyboard);
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleSocials:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handleAccountCallback(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleAccountCallback called for user ${telegramId}`);
  
  try {
    // Отвечаем на callback сразу
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    const { id: userId } = await getOrCreateUser(callbackQuery.from);
    console.log(`[Telegram Bot] User ID: ${userId}`);
    
    const user = await getUserData(telegramId);
    console.log(`[Telegram Bot] User data:`, { hasDiscord: !!user?.discord_id, hasEmail: !!user?.email });
    
    const subscription = await getActiveSubscription(userId);
    console.log(`[Telegram Bot] Subscription:`, subscription ? 'active' : 'none');
    
    let endDate, daysLeft;
    if (subscription) {
      const end = new Date(subscription.end_date);
      endDate = end.toLocaleDateString('ru-RU');
      daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    
    console.log(`[Telegram Bot] User google_drive_email:`, user?.google_drive_email);
    
    const accountText = await messages.account({
      hasSubscription: !!subscription,
      endDate,
      daysLeft,
      discordConnected: !!user?.discord_id,
      discordUsername: user?.discord_username,
      emailConnected: !!user?.email,
      email: user?.email,
      googleDriveConnected: !!user?.google_drive_email,
      googleDriveEmail: user?.google_drive_email
    });
    
    console.log(`[Telegram Bot] Account text length: ${accountText.length}`);
    
    const discordOAuthUrl = getDiscordOAuthUrl(telegramId);
    // Всегда используем функцию по умолчанию для account, так как она динамически формирует кнопки на основе состояния пользователя
    // Кнопки из БД статичны и не учитывают текущее состояние подключений
    const accountKeyboard = getAccountKeyboard({
      hasSubscription: !!subscription,
      discordConnected: !!user?.discord_id,
      emailConnected: !!user?.email,
      googleDriveConnected: !!user?.google_drive_email,
      discordOAuthUrl
    });
    console.log(`[Telegram Bot] Account keyboard buttons count:`, accountKeyboard.inline_keyboard?.length || 0);
    
    console.log(`[Telegram Bot] Account keyboard:`, JSON.stringify(accountKeyboard).substring(0, 200));
    
    try {
      const editResult = await editMessage(chatId, messageId, accountText, accountKeyboard);
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      // Если не удалось отредактировать (например, сообщение слишком старое), отправляем новое
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, accountText, accountKeyboard);
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleAccountCallback:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handleChangeEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await saveUserState(callbackQuery.from.id, 'changing_email', { returnTo: 'account' });
    await editMessage(chatId, messageId, `📧 <b>Введите Email</b>\n\nEmail используется для доступа к Notion:`, getEmailInputKeyboard());
  } catch (error) {
    console.error('Error in handleChangeEmail:', error);
  }
}

export async function handleReconnectDiscord(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await editMessage(chatId, messageId, await messages.connectDiscord(), {
      inline_keyboard: [
        [{ text: '🎮 Подключить Discord', url: getDiscordOAuthUrl(callbackQuery.from.id) }],
        [{ text: '◀️ Назад', callback_data: 'account' }]
      ]
    });
  } catch (error) {
    console.error('Error in handleReconnectDiscord:', error);
  }
}

export async function handleDisconnectDiscord(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await editMessage(chatId, messageId, `⚠️ <b>Отключить Discord?</b>\n\nВаша роль в Discord сервере будет снята.`, getConfirmDisconnectDiscordKeyboard());
  } catch (error) {
    console.error('Error in handleDisconnectDiscord:', error);
  }
}

export async function handleConfirmDisconnectDiscord(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const connection = await getConnection();
    try {
      const user = await getUserData(telegramId);
      if (user?.discord_id) {
        try {
          const { revokeRole } = await import('@/lib/discord-bot');
          const result = await revokeRole(user.discord_id);
          if (result.success) {
            console.log(`[Telegram Bot] Discord role revoked for ${user.discord_id}`);
          } else {
            console.error('[Telegram Bot] Failed to revoke Discord role:', result.error);
          }
        } catch (e) {
          console.error('[Telegram Bot] Error revoking Discord role:', e);
        }
      }
      if (user?.id) {
        await connection.execute(
          'UPDATE subscriptions SET discord_role_granted = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [user.id]
        );
      }
      await connection.execute('UPDATE users SET discord_id = NULL, discord_username = NULL, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?', [telegramId]);
      userDataCache.delete(telegramId);
    } finally {
      connection.release();
    }
    await sendMessage(chatId, await messages.discordDisconnected(), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleConfirmDisconnectDiscord:', error);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
}

export async function handleDisconnectEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await editMessage(chatId, messageId, `⚠️ <b>Отключить Email?</b>\n\nДоступ к Notion будет отозван.`, getConfirmDisconnectEmailKeyboard());
  } catch (error) {
    console.error('Error in handleDisconnectEmail:', error);
  }
}

export async function handleConfirmDisconnectEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id);
    const connection = await getConnection();
    try {
      const user = await getUserData(telegramId);
      if (user?.email) {
        console.log(`Revoking Notion access for ${user.email}`);
        // TODO: Отозвать доступ к Notion
      }
      await connection.execute('UPDATE users SET email = NULL, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?', [telegramId]);
      // Инвалидируем кэш данных пользователя
      userDataCache.delete(telegramId);
    } finally {
      connection.release();
    }
    await sendMessage(chatId, await messages.emailDisconnected(), getBackToMainKeyboard());
  } catch (error) {
    console.error('Error in handleConfirmDisconnectEmail:', error);
    await sendMessage(chatId, await messages.error());
  }
}

// Обработчики для Google Drive Email
export async function handleEnterGoogleDriveEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleEnterGoogleDriveEmail called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    const state = await getUserState(telegramId);
    const isFromConfirmOrder = state?.state === 'selecting_plan' && state?.data?.planId;
    await saveUserState(telegramId, 'entering_google_drive_email', {
      ...(state?.data || {}),
      returnTo: isFromConfirmOrder ? 'confirm_order' : 'account'
    });
    
    const googleDriveEmailText = await messages.askGoogleDriveEmail();
    console.log(`[Telegram Bot] Google Drive email text:`, googleDriveEmailText);
    
    try {
      const editResult = await editMessage(chatId, messageId, googleDriveEmailText, getGoogleDriveEmailInputKeyboard());
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, googleDriveEmailText, getGoogleDriveEmailInputKeyboard());
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleEnterGoogleDriveEmail:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handleGoogleDriveEmailInput(message: any): Promise<void> {
  const chatId = message.chat.id;
  const telegramId = message.from.id;
  const email = message.text.trim().toLowerCase();
  
  console.log(`[Telegram Bot] handleGoogleDriveEmailInput called for user ${telegramId}, email: ${email}`);
  
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sendMessage(chatId, await messages.invalidGoogleDriveEmail(), getGoogleDriveEmailInputKeyboard());
      return;
    }
    
    const connection = await getConnection();
    try {
      // Получаем старый email перед обновлением
      const user = await getUserData(telegramId);
      const oldEmail = user?.google_drive_email;
      
      await connection.execute(
        'UPDATE users SET google_drive_email = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
        [email, telegramId]
      );
      console.log(`[Telegram Bot] Google Drive email saved: ${email}`);
      // Инвалидируем кэш данных пользователя
      userDataCache.delete(telegramId);
      
      // Если у пользователя есть активная подписка, обновляем доступ к Google Drive
      const { id: userId } = await getOrCreateUser({ id: telegramId });
      const activeSubscription = await getActiveSubscription(userId);
      
      if (activeSubscription) {
        try {
          const { grantAccess, revokeAccess } = await import('@/lib/google-drive');
          
          // Отзываем доступ для старого email, если он был изменен
          if (oldEmail && oldEmail !== email) {
            const revokeResult = await revokeAccess(oldEmail);
            if (revokeResult.success) {
              console.log(`[Telegram Bot] Google Drive access revoked for old email: ${oldEmail}`);
            }
          }
          
          // Выдаем доступ для нового email
          const grantResult = await grantAccess(email, userId, activeSubscription.id);
          if (grantResult.success) {
            console.log(`[Telegram Bot] Google Drive access granted for ${email}`);
            // Обновляем статус выдачи доступа в подписке
            try {
              await connection.execute(
                `UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?`,
                [activeSubscription.id]
              );
            } catch (e: any) {
              // Если поле не существует, добавляем его
              if (e.code === 'ER_BAD_FIELD_ERROR') {
                try {
                  await connection.execute(
                    'ALTER TABLE subscriptions ADD COLUMN google_drive_access_granted BOOLEAN DEFAULT FALSE'
                  );
                  await connection.execute(
                    'UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?',
                    [activeSubscription.id]
                  );
                } catch (alterError) {
                  console.error('Failed to add google_drive_access_granted column:', alterError);
                }
              } else {
                console.error('Failed to update google_drive_access_granted:', e);
              }
            }
          } else {
            console.error(`[Telegram Bot] Failed to grant Google Drive access:`, grantResult.error);
          }
        } catch (e) {
          console.error('[Telegram Bot] Error managing Google Drive access:', e);
        }
      }
    } finally {
      connection.release();
    }
    
    const stateAfter = await getUserState(telegramId);
    if (stateAfter?.data?.returnTo === 'confirm_order' && stateAfter?.data?.planId) {
      await saveUserState(telegramId, 'selecting_plan', { ...stateAfter.data, returnTo: undefined });
      const userAfter = await getUserData(telegramId);
      const needsDiscord = !userAfter?.discord_id;
      const needsNotionEmail = !userAfter?.email;
      const hasPromocode = !!stateAfter.data?.promocode;
      const finalPrice = Number(stateAfter.data?.priceUsdt ?? stateAfter.data?.originalPrice);
      const confirmText = await messages.confirmOrder({
        planName: stateAfter.data.planName,
        period: stateAfter.data.period,
        priceUsdt: Number.isFinite(finalPrice) ? finalPrice : 0,
        discordUsername: userAfter?.discord_username,
        email: userAfter?.email,
        googleDriveEmail: email,
        promocode: stateAfter.data?.promocode,
        originalPrice: stateAfter.data?.originalPrice,
        discountPercent: stateAfter.data?.discountPercent,
        discountType: stateAfter.data?.discountType,
        discountAmount: stateAfter.data?.discountAmount
      });
      const keyboard = getConfirmKeyboard(needsDiscord, needsNotionEmail, false, getDiscordOAuthUrl(telegramId), hasPromocode);
      await sendMessage(chatId, confirmText, keyboard);
    } else {
      await clearUserState(telegramId);
      await sendMessage(chatId, `✅ Google Drive Email сохранён: <code>${email}</code>`, getBackToMainKeyboard());
    }
  } catch (error) {
    console.error('[Telegram Bot] Error in handleGoogleDriveEmailInput:', error);
    await sendMessage(chatId, await messages.error());
  }
}

export async function handleChangeGoogleDriveEmail(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleChangeGoogleDriveEmail called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    await saveUserState(telegramId, 'changing_google_drive_email', { returnTo: 'account' });
    
    const googleDriveEmailText = await messages.askGoogleDriveEmail();
    
    try {
      const editResult = await editMessage(chatId, messageId, googleDriveEmailText, getGoogleDriveEmailInputKeyboard());
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, googleDriveEmailText, getGoogleDriveEmailInputKeyboard());
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleChangeGoogleDriveEmail:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handleDisconnectGoogleDrive(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleDisconnectGoogleDrive called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    const disconnectText = await messages.confirmDisconnectGoogleDrive();
    
    try {
      const editResult = await editMessage(chatId, messageId, disconnectText, getConfirmDisconnectGoogleDriveKeyboard());
      console.log(`[Telegram Bot] Message edited successfully:`, editResult);
    } catch (editError: any) {
      console.error(`[Telegram Bot] Edit message error:`, editError);
      if (editError?.error_code === 400 || editError?.description?.includes('message') || editError?.description?.includes('not modified')) {
        console.log(`[Telegram Bot] Falling back to sendMessage`);
        const sendResult = await sendMessage(chatId, disconnectText, getConfirmDisconnectGoogleDriveKeyboard());
        console.log(`[Telegram Bot] Message sent:`, sendResult);
      } else {
        throw editError;
      }
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleDisconnectGoogleDrive:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handleConfirmDisconnectGoogleDrive(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handleConfirmDisconnectGoogleDrive called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    const connection = await getConnection();
    try {
      const user = await getUserData(telegramId);
      if (user?.google_drive_email) {
        console.log(`Revoking Google Drive access for ${user.google_drive_email}`);
        try {
          const { revokeAccess } = await import('@/lib/google-drive');
          const result = await revokeAccess(user.google_drive_email);
          if (result.success) {
            console.log(`[Google Drive] Access revoked successfully for ${user.google_drive_email}`);
          } else {
            console.error(`[Google Drive] Failed to revoke access:`, result.error);
          }
        } catch (e) {
          console.error('[Google Drive] Error revoking access:', e);
        }
      }
      await connection.execute(
        'UPDATE users SET google_drive_email = NULL, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
        [telegramId]
      );
      console.log(`[Telegram Bot] Google Drive email disconnected`);
    } finally {
      connection.release();
    }
    
    await sendMessage(chatId, await messages.googleDriveDisconnected(), getBackToMainKeyboard());
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handleConfirmDisconnectGoogleDrive:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handleCheckStatus(callbackQuery: any): Promise<void> {
  try {
    await answerCallback(callbackQuery.id);
    await handleStatus({ chat: callbackQuery.message.chat, from: callbackQuery.from });
  } catch (error) {
    console.error('Error in handleCheckStatus:', error);
  }
}

export async function handleBackToAccount(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  try {
    await answerCallback(callbackQuery.id);
    await clearUserState(callbackQuery.from.id);
    const { id: userId } = await getOrCreateUser(callbackQuery.from);
    const user = await getUserData(callbackQuery.from.id);
    const subscription = await getActiveSubscription(userId);
    
    let endDate, daysLeft;
    if (subscription) {
      const end = new Date(subscription.end_date);
      endDate = end.toLocaleDateString('ru-RU');
      daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    
    const discordOAuthUrl = getDiscordOAuthUrl(callbackQuery.from.id);
    const accountKeyboard = await getBotButtons('account', { discordOAuthUrl }) ?? getAccountKeyboard({
      hasSubscription: !!subscription,
      discordConnected: !!user?.discord_id,
      emailConnected: !!user?.email,
      googleDriveConnected: !!user?.google_drive_email,
      discordOAuthUrl
    });
    
    const tariffName = await getTariffNameForUser(userId);
    const accountPayload = {
      hasSubscription: !!subscription,
      endDate,
      daysLeft,
      tariffName,
      discordConnected: !!user?.discord_id,
      discordUsername: user?.discord_username,
      emailConnected: !!user?.email,
      email: user?.email,
      googleDriveConnected: !!user?.google_drive_email,
      googleDriveEmail: user?.google_drive_email
    };
    try {
      await editMessage(chatId, messageId, await messages.account(accountPayload), accountKeyboard);
    } catch (editError: any) {
      // Если не удалось отредактировать, отправляем новое сообщение
      if (editError?.error_code === 400 || editError?.description?.includes('message')) {
        await sendMessage(chatId, await messages.account(accountPayload), accountKeyboard);
      } else {
        throw editError;
      }
    }
  } catch (error) {
    console.error('Error in handleBackToAccount:', error);
    await sendMessage(chatId, await messages.error()).catch(() => {});
  }
}

export async function handleRefreshAccountInfo(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const from = callbackQuery.from;
  try {
    await answerCallback(callbackQuery.id, '🔄 Обновляю...');
    const { id: userId } = await getOrCreateUser(from);
    const user = await getUserData(from.id);
    const subscription = await getActiveSubscription(userId);

    let endDate: string | undefined, daysLeft: number | undefined;
    if (subscription) {
      const end = new Date(subscription.end_date);
      endDate = end.toLocaleDateString('ru-RU');
      daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    const tariffName = await getTariffNameForUser(userId);
    const accountText = await messages.account({
      hasSubscription: !!subscription,
      endDate,
      daysLeft,
      tariffName,
      discordConnected: !!user?.discord_id,
      discordUsername: user?.discord_username,
      emailConnected: !!user?.email,
      email: user?.email,
      googleDriveConnected: !!user?.google_drive_email,
      googleDriveEmail: user?.google_drive_email
    });

    await editMessage(
      chatId,
      messageId,
      accountText + '\n\n✅ Информация обновлена (имя и username из Telegram).',
      getAccountKeyboard({
        hasSubscription: !!subscription,
        discordConnected: !!user?.discord_id,
        emailConnected: !!user?.email,
        googleDriveConnected: !!user?.google_drive_email,
        discordOAuthUrl: getDiscordOAuthUrl(from.id)
      })
    );
  } catch (error) {
    console.error('Error in handleRefreshAccountInfo:', error);
    await answerCallback(callbackQuery.id).catch(() => {});
    await editMessage(chatId, messageId, '❌ Не удалось обновить. Попробуйте позже.', getBackToMainKeyboard()).catch(() => {});
  }
}

export async function handleCheckPaymentStatus(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  try {
    await answerCallback(callbackQuery.id, '🔄 Проверяем статус оплаты...');
    const state = await getUserState(telegramId);
    if (!state || state.state !== 'awaiting_payment' || !state.data?.paymentId) {
      await editMessage(chatId, messageId, 'У вас нет ожидающих оплату платежей. Если вы уже оплатили — подписка придёт по webhook в течение нескольких минут.', getBackToMainKeyboard());
      return;
    }
    const connection = await getConnection();
    let externalId: string | null = null;
    try {
      const [rows] = await connection.execute(
        'SELECT external_id, provider_data FROM payments WHERE id = ?',
        [state.data.paymentId]
      );
      const row = (rows as any[])[0];
      if (row?.external_id) {
        externalId = String(row.external_id);
      } else if (row?.provider_data) {
        try {
          const pd = typeof row.provider_data === 'string' ? JSON.parse(row.provider_data) : row.provider_data;
          if (pd?.payment_id != null) externalId = String(pd.payment_id);
          else if (pd?.invoice_id != null) externalId = String(pd.invoice_id);
        } catch (_) {}
      }
    } finally {
      connection.release();
    }
    if (!externalId) {
      await editMessage(chatId, messageId, 'Не удалось определить платёж. Дождитесь уведомления об активации подписки или обратитесь в поддержку.', getBackToMainKeyboard());
      return;
    }
    let status: { payment_status?: string; payment_id?: number };
    try {
      status = await nowPayments.getPaymentStatus(externalId);
    } catch (e) {
      console.warn('[Telegram Bot] getPaymentStatus failed for', externalId, e);
      await editMessage(chatId, messageId, 'Не удалось получить статус у платёжной системы. Подписка может прийти по webhook. Нажмите «Проверить статус» позже или дождитесь уведомления.', getPaymentKeyboard());
      return;
    }
    const statusLower = (status?.payment_status || '').toLowerCase();
    if (statusLower === 'finished') {
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
      const confirmSecret = process.env.NOWPAYMENTS_CONFIRM_SECRET;
      const body: { payment_id: string; secret?: string } = { payment_id: String(status.payment_id ?? externalId) };
      if (confirmSecret) body.secret = confirmSecret;
      try {
        const res = await fetch(`${baseUrl}/api/nowpayments/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(INTERNAL_API_TIMEOUT_MS)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          await clearUserState(telegramId);
          let communityUrl = (process.env.DISCORD_INVITE_URL || '').trim();
          try {
            const conn = await getConnection();
            const [linkRows] = await conn.execute(
              `SELECT \`key\`, value FROM site_contact_links WHERE \`key\` IN ('community_button_url', 'discord_invite_url')`
            );
            const linkMap: Record<string, string> = {};
            for (const r of linkRows as { key: string; value: string | null }[]) {
              linkMap[r.key] = (r.value ?? '').trim();
            }
            communityUrl = linkMap.community_button_url || linkMap.discord_invite_url || communityUrl;
            conn.release();
          } catch (_) {}
          await editMessage(chatId, messageId, await messages.paymentSuccess(), getSuccessKeyboard(communityUrl));
          return;
        }
        if (data.error === 'Payment not found in DB') {
          await editMessage(chatId, messageId, 'Платёж не найден в базе. Обратитесь в поддержку.', getBackToMainKeyboard());
          return;
        }
      } catch (fetchErr) {
        console.error('[Telegram Bot] confirm-payment fetch error:', fetchErr);
      }
      await editMessage(chatId, messageId, 'Оплата завершена у платёжной системы, но активация не прошла. Подписка должна прийти по webhook. Если не пришла — напишите в поддержку.', getBackToMainKeyboard());
      return;
    }
    if (statusLower === 'confirming' || statusLower === 'waiting' || statusLower === 'sending') {
      await editMessage(chatId, messageId, '⏳ Платёж в обработке (подтверждение в блокчейне). Подождите несколько минут и нажмите «Проверить статус» снова.', getPaymentKeyboard());
      return;
    }
    if (statusLower === 'failed' || statusLower === 'expired') {
      await editMessage(chatId, messageId, `Платёж не прошёл (статус: ${statusLower}). Создайте новый заказ, если хотите оформить подписку.`, getBackToMainKeyboard());
      return;
    }
    await editMessage(chatId, messageId, `Текущий статус: ${statusLower || 'ожидание'}. После оплаты нажмите «Проверить статус» снова или дождитесь уведомления.`, getPaymentKeyboard());
  } catch (error) {
    console.error('Error in handleCheckPaymentStatus:', error);
    await editMessage(chatId, messageId, 'Не удалось проверить статус. Попробуйте позже или дождитесь уведомления.', getBackToMainKeyboard()).catch(() => {});
  }
}

export async function handleDiscordInput(message: any): Promise<void> {
  await sendMessage(message.chat.id, '⚠️ Для подключения Discord нажмите кнопку <b>"🎮 Подключить Discord"</b>.', getBackToMainKeyboard());
}

export async function handlePaymentHistory(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const telegramId = callbackQuery.from.id;
  
  console.log(`[Telegram Bot] handlePaymentHistory called for user ${telegramId}`);
  
  try {
    const answerResult = await answerCallback(callbackQuery.id);
    console.log(`[Telegram Bot] Callback answered:`, answerResult);
    
    // Генерируем токен для доступа к истории платежей
    const token = generatePaymentHistoryToken(telegramId);
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    
    // Проверяем, что URL публичный (не localhost)
    // Для разработки можно использовать ngrok или другой туннель
    if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      console.warn(`[Telegram Bot] NEXT_PUBLIC_BASE_URL is not set or is localhost: ${baseUrl}`);
      console.warn(`[Telegram Bot] Telegram requires public URLs for button links. Use ngrok or set NEXT_PUBLIC_BASE_URL to a public URL.`);
      
      // Пытаемся найти ngrok URL в переменных окружения
      const ngrokUrl = process.env.NGROK_URL || process.env.PUBLIC_URL;
      if (ngrokUrl && !ngrokUrl.includes('localhost')) {
        baseUrl = ngrokUrl.replace(/\/$/, '');
        console.log(`[Telegram Bot] Using ngrok/public URL: ${baseUrl}`);
      } else {
        // Отправляем сообщение с инструкцией
        await sendMessage(chatId, `⚠️ <b>История платежей</b>

Для просмотра истории платежей необходимо настроить публичный URL сервера.

В режиме разработки используйте ngrok или другой туннель и установите переменную окружения:
<code>NEXT_PUBLIC_BASE_URL=https://your-ngrok-url.ngrok.io</code>

Или обратитесь к администратору для настройки продакшн URL.`);
        return;
      }
    }
    
    // Убираем trailing slash если есть
    baseUrl = baseUrl.replace(/\/$/, '');
    
    // Проверяем, что URL начинается с http:// или https://
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    const paymentHistoryUrl = `${baseUrl}/payments/history?token=${token}`;
    
    console.log(`[Telegram Bot] Generated payment history URL: ${paymentHistoryUrl}`);
    
    // Проверяем валидность URL для Telegram
    try {
      new URL(paymentHistoryUrl);
    } catch (urlError) {
      console.error(`[Telegram Bot] Invalid URL format: ${paymentHistoryUrl}`, urlError);
      await sendMessage(chatId, `❌ <b>Ошибка</b>\n\nНе удалось создать ссылку на историю платежей. Проверьте настройки сервера.`);
      return;
    }
    
    const message = `📜 <b>История платежей</b>

Откройте ссылку ниже, чтобы просмотреть полную историю ваших платежей в браузере:

🔗 <a href="${paymentHistoryUrl}">Открыть историю платежей</a>

Или нажмите кнопку ниже:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '📜 Открыть историю платежей', url: paymentHistoryUrl }],
        [{ text: '◀️ Назад', callback_data: 'back_to_account' }]
      ]
    };
    
    console.log(`[Telegram Bot] Keyboard:`, JSON.stringify(keyboard));
    
    // Всегда отправляем новое сообщение для истории платежей, чтобы ссылка была видна
    const sendResult = await sendMessage(chatId, message, keyboard);
    console.log(`[Telegram Bot] Message sent:`, sendResult);
    
    if (!sendResult.ok) {
      console.error(`[Telegram Bot] Failed to send payment history message:`, sendResult);
      throw new Error(`Failed to send message: ${sendResult.description || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Error in handlePaymentHistory:', error);
    console.error('[Telegram Bot] Error stack:', error?.stack);
    try {
      await sendMessage(chatId, await messages.error());
    } catch (sendError) {
      console.error('[Telegram Bot] Error sending error message:', sendError);
    }
  }
}

export async function handlePaymentHistoryPage(callbackQuery: any): Promise<void> {
  // Для пагинации истории платежей (если понадобится в будущем)
  await handlePaymentHistory(callbackQuery);
}
