/**
 * Общая логика уведомлений при истечении подписки и «за N дней».
 * Используется планировщиком и API обновления подписки.
 */

import { sendDM } from '@/lib/discord-bot';
import { sendMessage } from '@/lib/telegram-bot';
import { getBotText } from '@/lib/telegram-bot/get-text';
import crypto from 'crypto';

const SETTINGS_ROW_ID = 'default';

/** Клавиатура с кнопкой «Продлить подписку» для уведомлений об истечении и «скоро истечёт». */
const RENEW_SUBSCRIPTION_KEYBOARD = {
  inline_keyboard: [[{ text: '🔄 Продлить подписку', callback_data: 'buy_subscription' }]] as const
};
const DEFAULT_EXPIRING =
  '⚠️ <b>Ваша подписка скоро истечёт!</b>\n\n📅 Дата окончания: {{endDate}}\n⏳ Осталось: {{daysLeft}} дн.\n\nПродлите подписку, чтобы не потерять доступ.';

export async function getActualTariffIds(connection: any): Promise<{ ids: string[]; daysToPay: number } | null> {
  try {
    const [settingsRows] = await connection.execute(
      'SELECT days_after_expiry_switch AS days, actual_tariff_id AS tariff_id, use_all_active_tariffs AS use_all FROM subscription_tariff_settings WHERE id = ?',
      [SETTINGS_ROW_ID]
    );
    if ((settingsRows as any[]).length === 0) return null;
    const row = (settingsRows as any[])[0];
    const daysToPay = Math.max(0, Number(row.days) || 5);
    const useAllActive = Boolean(row.use_all);
    let ids: string[] = [];
    if (useAllActive) {
      const [allTariffs] = await connection.execute(
        `SELECT id FROM tariffs WHERE is_active = 1 AND is_archived = 0 AND is_custom = 0 ORDER BY sort_order ASC, created_at DESC`
      );
      ids = (allTariffs as any[]).map((r: any) => r.id);
    } else {
      let actualTariffId: string | null = row.tariff_id ? String(row.tariff_id) : null;
      if (actualTariffId === null) {
        const [defaultTariff] = await connection.execute(
          `SELECT id FROM tariffs WHERE is_active = 1 AND is_archived = 0 AND is_custom = 0 ORDER BY sort_order ASC, created_at DESC LIMIT 1`
        );
        if ((defaultTariff as any[]).length === 0) return null;
        actualTariffId = (defaultTariff as any[])[0].id ?? null;
      }
      if (actualTariffId) ids = [actualTariffId];
    }
    return { ids, daysToPay };
  } catch {
    return null;
  }
}

export async function getUserTariffIds(connection: any, userId: string): Promise<string[]> {
  try {
    const [rows] = await connection.execute('SELECT tariff_id FROM user_available_tariffs WHERE user_id = ?', [userId]);
    return (rows as any[]).map((r: any) => r.tariff_id).filter(Boolean);
  } catch {
    return [];
  }
}

/** Есть ли у пользователя другая активная подписка (кроме указанной). Не отзывать доступы и не слать «истекла», если есть. */
export async function userHasOtherActiveSubscription(
  connection: any,
  userId: string,
  excludeSubscriptionId: string
): Promise<boolean> {
  try {
    const [rows] = await connection.execute(
      `SELECT 1 FROM subscriptions 
       WHERE user_id = ? AND status = 'active' AND end_date > NOW() AND id != ? 
       LIMIT 1`,
      [userId, excludeSubscriptionId]
    );
    return (rows as any[]).length > 0;
  } catch {
    return false;
  }
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const x of b) if (!setA.has(x)) return false;
  return true;
}

/** Текст сообщения в Telegram при истечении подписки (с учётом «актуального» тарифа и дней до смены). */
export async function buildExpiredTelegramMessage(connection: any, subscription: { user_id: string }): Promise<string> {
  const actual = await getActualTariffIds(connection);
  const userTariffIds = await getUserTariffIds(connection, subscription.user_id);
  const hasActualTariff = actual && setsEqual([...userTariffIds].sort(), [...actual.ids].sort());
  const daysToPay = actual?.daysToPay ?? 5;
  return hasActualTariff
    ? `❌ <b>Ваша подписка истекла</b>\n\nДоступ к Discord и Notion снят.\n\nИспользуйте /start чтобы продлить подписку.`
    : `❌ <b>Ваша подписка истекла</b>\n\nДоступ к Discord и Notion снят.\n\nУ вас есть <b>${daysToPay}</b> дн. чтобы оплатить и сохранить текущий тариф. Используйте /start для продления.`;
}

/** Отправить пользователю уведомление об истечении подписки (Telegram + Discord DM). */
export async function sendExpiredNotificationToUser(
  connection: any,
  subscription: { user_id: string; telegram_id?: number | null; discord_id?: string | null }
): Promise<void> {
  if (subscription.telegram_id) {
    try {
      const text = await buildExpiredTelegramMessage(connection, subscription);
      await sendMessage(subscription.telegram_id, text, RENEW_SUBSCRIPTION_KEYBOARD);
    } catch (error) {
      console.error(`Failed to send expired notification to user ${subscription.telegram_id}:`, error);
    }
  }
  if (subscription.discord_id) {
    try {
      await sendDM(
        subscription.discord_id,
        '❌ **Ваша подписка Afina DAO истекла**\n\nДоступ к приватным каналам был отозван.\n\nПродлите подписку через Telegram бота.'
      );
    } catch {
      // DM могут быть отключены
    }
  }
}

/** Найти ключ и значение текста уведомления «за N дней» в telegram_bot_texts. */
async function getExpiringNotificationBlock(
  connection: any,
  daysLeft: number
): Promise<{ key: string; value: string } | null> {
  const [rows] = await connection.execute(
    `SELECT \`key\`, value, notification_condition FROM telegram_bot_texts 
     WHERE section = 'notifications' AND notification_condition IS NOT NULL`
  );
  for (const r of rows as any[]) {
    let nc: { type?: string; days?: number } | null = null;
    if (r.notification_condition) {
      try {
        nc = typeof r.notification_condition === 'string' ? JSON.parse(r.notification_condition) : r.notification_condition;
      } catch {}
    }
    if (nc?.type === 'days_before_expiry' && nc.days === daysLeft && r.value) {
      return { key: r.key, value: r.value };
    }
  }
  return null;
}

/** Проверить, есть ли в настройках бот-текстов уведомление «за N дней» (отправлять только за указанные в условиях дни). */
export async function hasExpiringNotificationForDays(connection: any, daysLeft: number): Promise<boolean> {
  const block = await getExpiringNotificationBlock(connection, daysLeft);
  return block != null;
}

/** Отправить пользователю уведомление «осталось N дней» только если для этого N есть блок в telegram_bot_texts (условия). Иначе не отправлять. */
export async function sendExpiringInDaysNotification(
  connection: any,
  subscription: { id: string; user_id: string; end_date: string | Date; telegram_id?: number | null },
  daysLeft: number
): Promise<void> {
  if (!subscription.telegram_id || daysLeft < 1) return;
  const block = await getExpiringNotificationBlock(connection, daysLeft);
  if (!block) return; // присылать только за указанное в условиях время — для этого N блока нет
  const endDate = new Date(subscription.end_date).toLocaleDateString('ru-RU');
  const daysLeftStr = String(daysLeft);
  let text = await getBotText(block.key, { endDate, daysLeft: daysLeftStr });
  if (!text || !text.trim()) {
    text = (block.value || DEFAULT_EXPIRING)
      .replace(/\{\{endDate\}\}/g, endDate)
      .replace(/\{\{daysLeft\}\}/g, daysLeftStr);
  }
  await sendMessage(subscription.telegram_id, text, RENEW_SUBSCRIPTION_KEYBOARD);
  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), subscription.user_id, subscription.id, `${block.key}_sent`, JSON.stringify({ sentAt: new Date().toISOString(), source: 'admin_edit' })]
  );
}
