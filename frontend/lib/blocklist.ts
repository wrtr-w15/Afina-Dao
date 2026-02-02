import { getConnection } from '@/lib/database';
import { sendTelegramMessageToAll } from '@/lib/telegram';

export type BlocklistType = 'telegram_subscription' | 'email' | 'discord';

/**
 * Проверяет, заблокировано ли значение для данного типа.
 * telegram_subscription: value — telegram_id (number) или username (string, с @ или без).
 * email: value — email (сравнивается в lower case).
 * discord: value — discord_id (string).
 */
export async function isBlocked(type: BlocklistType, value: string | number): Promise<boolean> {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT 1 FROM blocklist WHERE type = ? AND LOWER(TRIM(value)) = ? LIMIT 1',
      [type, normalized]
    );
    return (rows as any[]).length > 0;
  } catch {
    return false;
  } finally {
    connection.release();
  }
}

/**
 * Проверка Telegram для блокировки покупки подписки: по telegram_id и по username.
 */
export async function isTelegramBlockedForSubscription(telegramId: number, username?: string): Promise<boolean> {
  const byId = await isBlocked('telegram_subscription', String(telegramId));
  if (byId) return true;
  if (username) {
    const clean = username.replace(/^@/, '').trim().toLowerCase();
    if (clean && (await isBlocked('telegram_subscription', clean))) return true;
    if (await isBlocked('telegram_subscription', `@${username}`.trim().toLowerCase())) return true;
  }
  return false;
}

/**
 * Отправляет уведомление админу в бот 2FA о попытке использовать заблокированную почту или Discord.
 */
export async function notifyAdminBlockedAttempt(
  kind: 'email' | 'discord',
  value: string,
  telegramId?: number,
  telegramUsername?: string
): Promise<void> {
  const who = telegramId
    ? `TG: ${telegramUsername ? `@${telegramUsername}` : telegramId}`
    : 'неизвестный пользователь';
  const text =
    kind === 'email'
      ? `⚠️ *Блокировка:* попытка подключить заблокированную почту\n\nПочта: \`${value}\`\nПользователь: ${who}`
      : `⚠️ *Блокировка:* попытка подключить заблокированный Discord\n\nDiscord ID: \`${value}\`\nПользователь: ${who}`;
  await sendTelegramMessageToAll(text).catch((e) => console.error('Failed to send admin block notification:', e));
}
