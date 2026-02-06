import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { grantRole } from '@/lib/discord-bot';
import { grantAccess } from '@/lib/notion';
import { sendMessage } from '@/lib/telegram-bot';
import { sendTelegramMessageToAll } from '@/lib/telegram';
import { addMonths } from '@/lib/utils';
import crypto from 'crypto';

// POST /api/payments/webhook - вебхук от платёжной системы
export async function POST(request: NextRequest) {
  try {
    // Проверяем секретный ключ (зависит от платёжной системы)
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const signature = request.headers.get('x-webhook-signature');
    
    // TODO: Проверка подписи в зависимости от платёжной системы
    // if (webhookSecret && signature) {
    //   // Verify signature
    // }

    const body = await request.json();
    
    // Логируем входящий вебхук
    console.log('Payment webhook received:', JSON.stringify(body, null, 2));

    // Определяем тип события (структура зависит от платёжной системы)
    // Это пример для универсального формата
    const event = body.event || body.type || 'payment';
    const paymentData = body.data || body.object || body;

    const connection = await getConnection();
    try {
      switch (event) {
        case 'payment.succeeded':
        case 'payment_intent.succeeded':
        case 'charge.succeeded':
          await handlePaymentSuccess(connection, paymentData);
          break;

        case 'payment.failed':
        case 'payment_intent.payment_failed':
        case 'charge.failed':
          await handlePaymentFailed(connection, paymentData);
          break;

        case 'payment.refunded':
        case 'charge.refunded':
          await handlePaymentRefunded(connection, paymentData);
          break;

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      return NextResponse.json({ received: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Обработка успешной оплаты
async function handlePaymentSuccess(connection: any, data: any): Promise<void> {
  // Ищем платёж по external_id
  const externalId = data.id || data.payment_id || data.transaction_id;
  
  const [payments] = await connection.execute(
    `SELECT p.*, s.user_id, s.id as sub_id, u.discord_id, u.email, u.telegram_id 
     FROM payments p 
     LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci 
     LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci 
     WHERE p.external_id = ?`,
    [externalId]
  );

  if ((payments as any[]).length === 0) {
    console.log(`Payment not found for external_id: ${externalId}`);
    return;
  }

  const payment = (payments as any[])[0];
  
  if (payment.status === 'completed') {
    console.log(`Payment ${payment.id} already completed`);
    return;
  }

  // Обновляем платёж
  await connection.execute(
    `UPDATE payments SET status = 'completed', paid_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [payment.id]
  );

  // Активируем подписку на выбранный срок (period_months из подписки)
  const now = new Date();
  const [subscription] = await connection.execute(
    'SELECT period_months FROM subscriptions WHERE id = ?',
    [payment.sub_id]
  );
  const periodMonths = Math.max(1, Math.min(120, Math.floor(Number((subscription as any[])[0]?.period_months) || 1)));
  const endDate = addMonths(now, periodMonths);

  await connection.execute(
    `UPDATE subscriptions SET status = 'active', start_date = ?, end_date = ?, updated_at = NOW() WHERE id = ?`,
    [now, endDate, payment.sub_id]
  );

  // Один актуальный тариф у пользователя: при активации подписки выставляем только тариф этой подписки
  try {
    const [subRows] = await connection.execute('SELECT tariff_id FROM subscriptions WHERE id = ?', [payment.sub_id]);
    const tariffId = (subRows as any[])[0]?.tariff_id;
    if (tariffId) {
      await connection.execute('DELETE FROM user_available_tariffs WHERE user_id = ?', [payment.user_id]);
      await connection.execute(
        'INSERT INTO user_available_tariffs (id, user_id, tariff_id) VALUES (?, ?, ?)',
        [crypto.randomUUID(), payment.user_id, tariffId]
      );
    }
  } catch (e) {
    console.error('Error syncing user_available_tariffs:', e);
  }

  // Выдаём доступы
  let discordGranted = false;
  let notionGranted = false;

  if (payment.discord_id) {
    const result = await grantRole(payment.discord_id);
    discordGranted = result.success;
  }

  if (payment.email) {
    const result = await grantAccess(payment.email, payment.user_id, payment.sub_id);
    notionGranted = result.success;
  }

  // Обновляем статус выдачи доступов
  await connection.execute(
    `UPDATE subscriptions SET discord_role_granted = ?, notion_access_granted = ? WHERE id = ?`,
    [discordGranted, notionGranted, payment.sub_id]
  );

  // Логируем
  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'payment_webhook_success', ?)`,
    [
      crypto.randomUUID(),
      payment.user_id,
      payment.sub_id,
      JSON.stringify({ externalId, discordGranted, notionGranted })
    ]
  );

  // Уведомляем пользователя в Telegram
  if (payment.telegram_id) {
    try {
      await sendMessage(
        payment.telegram_id,
        `✅ <b>Оплата прошла успешно!</b>\n\nВаша подписка активирована до ${endDate.toLocaleDateString('ru-RU')}.`
      );
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
  }
}

// Обработка неудачной оплаты
async function handlePaymentFailed(connection: any, data: any): Promise<void> {
  const externalId = data.id || data.payment_id || data.transaction_id;
  const errorMessage = data.error?.message || data.failure_message || 'Payment failed';

  const [payments] = await connection.execute(
    `SELECT p.*, u.telegram_id FROM payments p 
     LEFT JOIN users u ON p.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci 
     WHERE p.external_id = ?`,
    [externalId]
  );

  if ((payments as any[]).length === 0) {
    return;
  }

  const payment = (payments as any[])[0];

  await connection.execute(
    `UPDATE payments SET status = 'failed', error_message = ?, updated_at = NOW() WHERE id = ?`,
    [errorMessage, payment.id]
  );

  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'payment_webhook_failed', ?)`,
    [
      crypto.randomUUID(),
      payment.user_id,
      payment.subscription_id,
      JSON.stringify({ externalId, errorMessage })
    ]
  );

  // Уведомляем пользователя
  if (payment.telegram_id) {
    try {
      await sendMessage(
        payment.telegram_id,
        `❌ <b>Ошибка оплаты</b>\n\n${errorMessage}\n\nПопробуйте ещё раз или обратитесь в поддержку.`
      );
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
  }
}

// Обработка возврата
async function handlePaymentRefunded(connection: any, data: any): Promise<void> {
  const externalId = data.id || data.payment_id || data.transaction_id;

  const [payments] = await connection.execute(
    'SELECT * FROM payments WHERE external_id = ?',
    [externalId]
  );

  if ((payments as any[]).length === 0) {
    return;
  }

  const payment = (payments as any[])[0];

  await connection.execute(
    `UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = ?`,
    [payment.id]
  );

  // Отменяем подписку
  await connection.execute(
    `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
    [payment.subscription_id]
  );

  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'payment_refunded', ?)`,
    [
      crypto.randomUUID(),
      payment.user_id,
      payment.subscription_id,
      JSON.stringify({ externalId })
    ]
  );

  // Уведомление в 2FA: подписка отменена (возврат), данные и почта для отзыва Notion
  try {
    const [subRows] = await connection.execute(
      `SELECT s.tariff_id, s.end_date, u.telegram_id, u.telegram_username, u.telegram_first_name, u.email, u.google_drive_email, u.discord_id
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [payment.subscription_id]
    );
    const row = (subRows as any[])[0];
    if (row) {
      let tariffName = '';
      if (row.tariff_id) {
        const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [row.tariff_id]);
        tariffName = (tRows as any[])[0]?.name || String(row.tariff_id);
      }
      const userInfo = row.telegram_username ? `@${row.telegram_username}` : row.telegram_first_name || `ID: ${row.telegram_id || 'N/A'}`;
      const endDateStr = row.end_date ? new Date(row.end_date).toLocaleDateString('ru-RU') : '—';
      const adminMessage = `
🔄 *Подписка отменена (возврат)*

*Пользователь:* ${userInfo}
*Telegram ID:* \`${row.telegram_id || 'N/A'}\`
*Имя:* ${row.telegram_first_name || '—'}
*Тариф:* ${tariffName || '—'}
*Окончание было:* ${endDateStr}
*Когда:* ${new Date().toLocaleString('ru-RU')}

*Email (Notion) — отозвать доступ вручную:* ${row.email ? `\`${row.email}\`` : '—'}
*Email (Google Drive):* ${row.google_drive_email ? `\`${row.google_drive_email}\`` : '—'}
*Discord ID:* ${row.discord_id ? `\`${row.discord_id}\`` : '—'}
      `.trim();
      await sendTelegramMessageToAll(adminMessage);
    }
  } catch (e) {
    console.error('Failed to send admin refund notification:', e);
  }
}
