// Scheduler для проверки истекших подписок

import { getConnection } from '@/lib/database';
import { revokeRole } from '@/lib/discord-bot';
import { revokeAccess } from '@/lib/notion';
import { sendMessage } from '@/lib/telegram-bot';
import { getBotText } from '@/lib/telegram-bot/get-text';
import { sendExpiredNotificationToUser } from '@/lib/subscription-notifications';
import { sendTelegramMessageToAll } from '@/lib/telegram';
import crypto from 'crypto';

const DEFAULT_EXPIRING_3_DAYS =
  '⚠️ <b>Ваша подписка скоро истечёт!</b>\n\n📅 Дата окончания: {{endDate}}\n⏳ Осталось: {{daysLeft}} дн.\n\nПродлите подписку, чтобы не потерять доступ.';

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

// Запуск scheduler
export function startScheduler(intervalMs: number = 60 * 60 * 1000): void {
  if (intervalId) {
    console.log('Scheduler already running');
    return;
  }

  console.log(`🕐 Starting subscription scheduler (interval: ${intervalMs / 1000 / 60} minutes)`);

  // Запускаем сразу при старте
  runScheduledTasks();

  // И затем по расписанию
  intervalId = setInterval(runScheduledTasks, intervalMs);
}

// Остановка scheduler
export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Scheduler stopped');
  }
}

// Основная функция scheduler
export async function runScheduledTasks(): Promise<void> {
  if (isRunning) {
    console.log('Scheduler already running, skipping...');
    return;
  }

  isRunning = true;
  console.log(`🔄 Running scheduled tasks at ${new Date().toISOString()}`);

  try {
    await checkExpiredSubscriptions();
    await checkExpiringSubscriptions();
    await switchExpiredUsersToActualTariff();
    await cleanupOldBotStates();
  } catch (error) {
    console.error('Error in scheduled tasks:', error);
  } finally {
    isRunning = false;
  }
}

// Проверка истекших подписок
async function checkExpiredSubscriptions(): Promise<void> {
  const connection = await getConnection();
  
  try {
    // Находим активные подписки с истёкшим сроком
    const [expired] = await connection.execute(`
      SELECT 
        s.*,
        u.telegram_id,
        u.telegram_username,
        u.telegram_first_name,
        u.discord_id,
        u.email,
        u.google_drive_email
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active' 
        AND s.end_date <= NOW()
    `);

    console.log(`Found ${(expired as any[]).length} expired subscriptions`);

    for (const subscription of expired as any[]) {
      try {
        await processExpiredSubscription(connection, subscription);
      } catch (error) {
        console.error(`Error processing expired subscription ${subscription.id}:`, error);
      }
    }
  } finally {
    connection.release();
  }
}

const SETTINGS_ROW_ID = 'default';

// Обработка истёкшей подписки
async function processExpiredSubscription(connection: any, subscription: any): Promise<void> {
  console.log(`Processing expired subscription: ${subscription.id}`);

  // Меняем статус на expired
  await connection.execute(
    `UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE id = ?`,
    [subscription.id]
  );

  // Забираем роль Discord
  if (subscription.discord_id && subscription.discord_role_granted) {
    try {
      await revokeRole(subscription.discord_id);
      await connection.execute(
        `UPDATE subscriptions SET discord_role_granted = FALSE WHERE id = ?`,
        [subscription.id]
      );
      console.log(`Discord role revoked for ${subscription.discord_id}`);
    } catch (error) {
      console.error(`Failed to revoke Discord role for ${subscription.discord_id}:`, error);
    }
  }

  // Отзываем доступ Notion
  if (subscription.email && subscription.notion_access_granted) {
    try {
      await revokeAccess(subscription.email);
      await connection.execute(
        `UPDATE subscriptions SET notion_access_granted = FALSE WHERE id = ?`,
        [subscription.id]
      );
      console.log(`Notion access revoked for ${subscription.email}`);
    } catch (error) {
      console.error(`Failed to revoke Notion access for ${subscription.email}:`, error);
    }
  }

  await sendExpiredNotificationToUser(connection, subscription);

  // Логируем
  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'subscription_expired', ?)`,
    [
      crypto.randomUUID(),
      subscription.user_id,
      subscription.id,
      JSON.stringify({
        discordRevoked: subscription.discord_role_granted,
        notionRevoked: subscription.notion_access_granted
      })
    ]
  );

  // Уведомление в 2FA: подписка истекла, данные пользователя и почта для отзыва доступа Notion
  try {
    let tariffName = '';
    if (subscription.tariff_id) {
      const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [subscription.tariff_id]);
      tariffName = (tRows as any[])[0]?.name || String(subscription.tariff_id);
    }
    const userInfo = subscription.telegram_username
      ? `@${subscription.telegram_username}`
      : subscription.telegram_first_name || `ID: ${subscription.telegram_id || 'N/A'}`;
    const endDateStr = subscription.end_date
      ? new Date(subscription.end_date).toLocaleDateString('ru-RU')
      : '—';
    const adminMessage = `
❌ *Подписка истекла*

*Пользователь:* ${userInfo}
*Telegram ID:* \`${subscription.telegram_id || 'N/A'}\`
*Имя:* ${subscription.telegram_first_name || '—'}
*Тариф:* ${tariffName || '—'}
*Окончание:* ${endDateStr}
*Когда:* ${new Date().toLocaleString('ru-RU')}

*Email (Notion) — отозвать доступ вручную:* ${subscription.email ? `\`${subscription.email}\`` : '—'}
*Email (Google Drive):* ${subscription.google_drive_email ? `\`${subscription.google_drive_email}\`` : '—'}
*Discord ID:* ${subscription.discord_id ? `\`${subscription.discord_id}\`` : '—'}
    `.trim();
    await sendTelegramMessageToAll(adminMessage);
  } catch (e) {
    console.error('Failed to send admin expired notification:', e);
  }
}

// Проверка подписок, которые скоро истекут — по блокам уведомлений из БД с условиями
async function checkExpiringSubscriptions(): Promise<void> {
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT \`key\`, value, notification_condition FROM telegram_bot_texts 
       WHERE section = 'notifications' AND notification_condition IS NOT NULL`
    );
    const notificationBlocks = (rows as any[]).map((r: any) => {
      let nc: { type?: string; days?: number } | null = null;
      if (r.notification_condition) {
        try {
          nc = typeof r.notification_condition === 'string' ? JSON.parse(r.notification_condition) : r.notification_condition;
        } catch {}
      }
      return { key: r.key, value: r.value, condition: nc };
    }).filter((b: { condition: { type?: string; days?: number } | null }) => b.condition?.type === 'days_before_expiry' && typeof b.condition.days === 'number' && b.condition.days >= 1);

    let totalSent = 0;
    for (const block of notificationBlocks) {
      const days = block.condition!.days!;
      const logAction = `${block.key}_sent`;
      const [subs] = await connection.execute(
        `SELECT s.*, u.telegram_id
         FROM subscriptions s
         LEFT JOIN users u ON s.user_id = u.id
         WHERE s.status = 'active'
           AND s.end_date > NOW()
           AND s.end_date > DATE_ADD(NOW(), INTERVAL ? DAY)
           AND s.end_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
           AND NOT EXISTS (
             SELECT 1 FROM subscription_logs sl
             WHERE sl.subscription_id = s.id AND sl.action = ?
           )`,
        [days - 1, days, logAction]
      );

      for (const subscription of subs as any[]) {
        if (subscription.telegram_id) {
          try {
            const endDate = new Date(subscription.end_date).toLocaleDateString('ru-RU');
            const daysLeftStr = String(days);
            let text = await getBotText(block.key, { endDate, daysLeft: daysLeftStr });
            if (!text || !text.trim()) {
              text = (block.value || DEFAULT_EXPIRING_3_DAYS)
                .replace(/\{\{endDate\}\}/g, endDate)
                .replace(/\{\{daysLeft\}\}/g, daysLeftStr);
            }
            await sendMessage(subscription.telegram_id, text);
            await connection.execute(
              `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
               VALUES (?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), subscription.user_id, subscription.id, logAction, JSON.stringify({ sentAt: new Date().toISOString() })]
            );
            totalSent += 1;
          } catch (error) {
            console.error(`Failed to send notification ${block.key} to ${subscription.telegram_id}:`, error);
          }
        }
      }
    }
    if (totalSent > 0 || notificationBlocks.length > 0) {
      console.log(`Processed ${notificationBlocks.length} notification block(s), sent ${totalSent} message(s)`);
    }
  } finally {
    connection.release();
  }
}

// Очистка старых состояний бота
async function cleanupOldBotStates(): Promise<void> {
  const connection = await getConnection();
  
  try {
    const [result] = await connection.execute(`
      DELETE FROM user_bot_states 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `);

    const affectedRows = (result as any).affectedRows || 0;
    if (affectedRows > 0) {
      console.log(`Cleaned up ${affectedRows} expired bot states`);
    }
  } finally {
    connection.release();
  }
}

/**
 * Через N дней после окончания подписки менять тариф пользователя на актуальный (из subscription_tariff_settings).
 */
async function switchExpiredUsersToActualTariff(): Promise<void> {
  const connection = await getConnection();
  try {
    const [settingsRows] = await connection.execute(
      'SELECT days_after_expiry_switch AS days, actual_tariff_id AS tariff_id, use_all_active_tariffs AS use_all FROM subscription_tariff_settings WHERE id = ?',
      [SETTINGS_ROW_ID]
    );
    if ((settingsRows as any[]).length === 0) return;

    const row = (settingsRows as any[])[0];
    const days = Number(row.days) || 0;
    const useAllActive = Boolean(row.use_all);
    let tariffIds: string[] = [];

    if (useAllActive) {
      const [allTariffs] = await connection.execute(
        `SELECT id FROM tariffs WHERE is_active = 1 AND is_archived = 0 AND is_custom = 0 ORDER BY sort_order ASC, created_at DESC`
      );
      tariffIds = (allTariffs as any[]).map((r: any) => r.id);
    } else {
      let actualTariffId: string | null = row.tariff_id ? String(row.tariff_id) : null;
      if (actualTariffId === null) {
        const [defaultTariff] = await connection.execute(
          `SELECT id FROM tariffs WHERE is_active = 1 AND is_archived = 0 AND is_custom = 0 ORDER BY sort_order ASC, created_at DESC LIMIT 1`
        );
        if ((defaultTariff as any[]).length === 0) return;
        actualTariffId = (defaultTariff as any[])[0].id;
      }
      tariffIds = [actualTariffId];
    }

    if (tariffIds.length === 0) return;

    const [userRows] = await connection.execute(
      `SELECT DISTINCT s.user_id
       FROM subscriptions s
       WHERE s.status = 'expired' AND s.end_date <= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND NOT EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = s.user_id AND s2.status = 'active')`,
      [days]
    );

    const userIds = (userRows as any[]).map((r: any) => r.user_id);
    if (userIds.length === 0) return;

    for (const userId of userIds) {
      try {
        await connection.execute('DELETE FROM user_available_tariffs WHERE user_id = ?', [userId]);
        for (const tariffId of tariffIds) {
          await connection.execute(
            'INSERT INTO user_available_tariffs (id, user_id, tariff_id) VALUES (?, ?, ?)',
            [crypto.randomUUID(), userId, tariffId]
          );
        }
      } catch (e) {
        console.error(`Failed to switch tariff for user ${userId}:`, e);
      }
    }

    if (userIds.length > 0) {
      const label = useAllActive ? `all ${tariffIds.length} active tariffs` : `tariff ${tariffIds[0]}`;
      console.log(`Switched ${userIds.length} user(s) to ${label} (after ${days} days expiry)`);
    }
  } catch (e) {
    // Таблица subscription_tariff_settings может отсутствовать
    try {
      const [tables] = await connection.execute(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_tariff_settings'`
      );
      if ((tables as any[]).length === 0) return;
    } catch {
      return;
    }
    console.error('Error in switchExpiredUsersToActualTariff:', e);
  } finally {
    connection.release();
  }
}

// API endpoint для ручного запуска
export async function triggerScheduler(): Promise<{ success: boolean; message: string }> {
  try {
    await runScheduledTasks();
    return { success: true, message: 'Scheduled tasks completed' };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
