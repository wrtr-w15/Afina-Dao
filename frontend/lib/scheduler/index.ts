// Scheduler для проверки истекших подписок

import { getConnection } from '@/lib/database';
import { revokeRole, sendDM } from '@/lib/discord-bot';
import { revokeAccess } from '@/lib/notion';
import { sendMessage } from '@/lib/telegram-bot';
import crypto from 'crypto';

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
        u.discord_id,
        u.email
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

  // Уведомляем пользователя в Telegram
  if (subscription.telegram_id) {
    try {
      await sendMessage(
        subscription.telegram_id,
        `❌ <b>Ваша подписка истекла</b>\n\nДоступ к Discord и Notion был отозван.\n\nИспользуйте /start чтобы продлить подписку.`
      );
    } catch (error) {
      console.error(`Failed to notify user ${subscription.telegram_id}:`, error);
    }
  }

  // Уведомляем в Discord DM
  if (subscription.discord_id) {
    try {
      await sendDM(
        subscription.discord_id,
        '❌ **Ваша подписка Afina DAO истекла**\n\nДоступ к приватным каналам был отозван.\n\nПродлите подписку через Telegram бота.'
      );
    } catch (error) {
      // DM могут быть отключены - это нормально
    }
  }

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
}

// Проверка подписок, которые скоро истекут (за 3 дня и за 1 день)
async function checkExpiringSubscriptions(): Promise<void> {
  const connection = await getConnection();
  
  try {
    // Подписки, истекающие через 3 дня
    const [expiringIn3Days] = await connection.execute(`
      SELECT 
        s.*,
        u.telegram_id
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active' 
        AND s.end_date > NOW()
        AND s.end_date <= DATE_ADD(NOW(), INTERVAL 3 DAY)
        AND s.end_date > DATE_ADD(NOW(), INTERVAL 2 DAY)
    `);

    for (const subscription of expiringIn3Days as any[]) {
      if (subscription.telegram_id) {
        try {
          const endDate = new Date(subscription.end_date).toLocaleDateString('ru-RU');
          await sendMessage(
            subscription.telegram_id,
            `⚠️ <b>Ваша подписка скоро истечёт!</b>\n\n📅 Дата окончания: ${endDate}\n⏳ Осталось: 3 дня\n\nПродлите подписку, чтобы не потерять доступ.`
          );
        } catch (error) {
          console.error(`Failed to send expiring notification to ${subscription.telegram_id}:`, error);
        }
      }
    }

    // Подписки, истекающие завтра
    const [expiringTomorrow] = await connection.execute(`
      SELECT 
        s.*,
        u.telegram_id
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active' 
        AND s.end_date > NOW()
        AND s.end_date <= DATE_ADD(NOW(), INTERVAL 1 DAY)
    `);

    for (const subscription of expiringTomorrow as any[]) {
      if (subscription.telegram_id) {
        try {
          await sendMessage(
            subscription.telegram_id,
            `🔴 <b>Внимание! Ваша подписка истекает завтра!</b>\n\nЕсли вы не продлите подписку, доступ будет отозван.\n\nИспользуйте /start для продления.`
          );
        } catch (error) {
          console.error(`Failed to send urgent notification to ${subscription.telegram_id}:`, error);
        }
      }
    }

    console.log(`Sent ${(expiringIn3Days as any[]).length} 3-day warnings and ${(expiringTomorrow as any[]).length} 1-day warnings`);
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
