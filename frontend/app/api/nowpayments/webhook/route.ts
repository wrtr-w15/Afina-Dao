import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { PaymentStatuses, IPNPayload } from '@/lib/nowpayments';
import { grantRole } from '@/lib/discord-bot';
import { grantAccess } from '@/lib/notion';
import { grantAccess as grantGoogleDriveAccess } from '@/lib/google-drive';
import { sendMessage } from '@/lib/telegram-bot';
import crypto from 'crypto';

// Проверка подписи IPN
function verifyIPNSignature(payload: string, signature: string): boolean {
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    console.error('NOWPAYMENTS_IPN_SECRET not set');
    return false;
  }

  // Сортируем ключи JSON и создаём HMAC-SHA512
  try {
    const data = JSON.parse(payload);
    const sortedData = sortObject(data);
    const sortedPayload = JSON.stringify(sortedData);
    
    const hmac = crypto.createHmac('sha512', ipnSecret);
    hmac.update(sortedPayload);
    const calculatedSignature = hmac.digest('hex');

    return calculatedSignature === signature;
  } catch (error) {
    console.error('Error verifying IPN signature:', error);
    return false;
  }
}

// Рекурсивная сортировка объекта по ключам
function sortObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObject(item));
  }

  return Object.keys(obj)
    .sort()
    .reduce((result: any, key) => {
      result[key] = sortObject(obj[key]);
      return result;
    }, {});
}

// POST /api/nowpayments/webhook - IPN webhook от NOWPayments
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-nowpayments-sig');

    console.log('NOWPayments IPN received:', rawBody.substring(0, 500));
    console.log('Signature:', signature);

    // Проверяем подпись (в production обязательно!)
    if (process.env.NODE_ENV === 'production' && signature) {
      if (!verifyIPNSignature(rawBody, signature)) {
        console.error('Invalid IPN signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const ipnData: IPNPayload = JSON.parse(rawBody);
    
    console.log('IPN Data:', {
      payment_id: ipnData.payment_id,
      payment_status: ipnData.payment_status,
      order_id: ipnData.order_id,
      actually_paid: ipnData.actually_paid,
      price_amount: ipnData.price_amount
    });

    const connection = await getConnection();
    try {
      // Ищем платёж по external_id (invoice_id или payment_id)
      const externalId = ipnData.invoice_id?.toString() || ipnData.payment_id?.toString();
      
      const [payments] = await connection.execute(
        `SELECT p.*, s.user_id, s.id as sub_id, s.period_months, 
                u.discord_id, u.email, u.google_drive_email, u.telegram_id 
         FROM payments p 
         LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci
         LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
         WHERE p.external_id = ? OR JSON_EXTRACT(p.provider_data, '$.invoice_id') = ?`,
        [externalId, ipnData.invoice_id]
      );

      if ((payments as any[]).length === 0) {
        console.log(`Payment not found for external_id: ${externalId}`);
        // Возвращаем 200 чтобы NOWPayments не пытался переслать
        return NextResponse.json({ received: true, status: 'payment_not_found' });
      }

      const payment = (payments as any[])[0];

      // Логируем IPN
      await connection.execute(
        `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
         VALUES (?, ?, ?, 'nowpayments_ipn', ?)`,
        [
          crypto.randomUUID(),
          payment.user_id,
          payment.sub_id,
          JSON.stringify({
            payment_id: ipnData.payment_id,
            payment_status: ipnData.payment_status,
            actually_paid: ipnData.actually_paid,
            pay_currency: ipnData.pay_currency,
            price_amount: ipnData.price_amount
          })
        ]
      );

      // Всегда сохраняем payment_id и статус в provider_data — для кнопки «Проверить статус» в боте
      await connection.execute(
        `UPDATE payments 
         SET provider_data = JSON_SET(COALESCE(provider_data, '{}'), '$.payment_id', ?, '$.payment_status', ?),
             updated_at = NOW() 
         WHERE id = ?`,
        [ipnData.payment_id, ipnData.payment_status, payment.id]
      );

      // Обрабатываем статусы платежа
      switch (ipnData.payment_status) {
        case PaymentStatuses.FINISHED:
          await handlePaymentSuccess(connection, payment, ipnData);
          break;

        case PaymentStatuses.FAILED:
        case PaymentStatuses.EXPIRED:
          await handlePaymentFailed(connection, payment, ipnData);
          break;

        case PaymentStatuses.REFUNDED:
          await handlePaymentRefunded(connection, payment, ipnData);
          break;

        case PaymentStatuses.PARTIALLY_PAID:
          await handlePartialPayment(connection, payment, ipnData);
          break;

        case PaymentStatuses.CONFIRMING:
        case PaymentStatuses.CONFIRMED:
        case PaymentStatuses.SENDING:
        case PaymentStatuses.WAITING:
          // Обновляем статус в provider_data
          await connection.execute(
            `UPDATE payments 
             SET provider_data = JSON_SET(COALESCE(provider_data, '{}'), '$.payment_status', ?),
                 updated_at = NOW()
             WHERE id = ?`,
            [ipnData.payment_status, payment.id]
          );
          
          // Уведомляем пользователя о статусе
          if (payment.telegram_id && ipnData.payment_status === PaymentStatuses.CONFIRMING) {
            try {
              await sendMessage(
                payment.telegram_id,
                `⏳ <b>Платёж в обработке</b>\n\nВаш платёж получен и находится на подтверждении в блокчейне. Это займёт несколько минут.`
              );
            } catch (e) {
              console.error('Failed to send Telegram notification:', e);
            }
          }
          break;

        default:
          console.log(`Unknown payment status: ${ipnData.payment_status}`);
      }

      return NextResponse.json({ received: true, status: ipnData.payment_status });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error processing NOWPayments webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Успешный платёж
async function handlePaymentSuccess(connection: any, payment: any, ipnData: IPNPayload): Promise<void> {
  if (payment.status === 'completed') {
    console.log(`Payment ${payment.id} already completed`);
    return;
  }

  // Обновляем платёж
  await connection.execute(
    `UPDATE payments 
     SET status = 'completed', 
         paid_at = NOW(),
         provider_data = JSON_SET(COALESCE(provider_data, '{}'), 
           '$.payment_status', ?,
           '$.payment_id', ?,
           '$.actually_paid', ?,
           '$.pay_currency', ?
         ),
         updated_at = NOW() 
     WHERE id = ?`,
    [
      ipnData.payment_status,
      ipnData.payment_id,
      ipnData.actually_paid,
      ipnData.pay_currency,
      payment.id
    ]
  );

  // Активируем подписку
  const now = new Date();
  const periodMonths = payment.period_months || 1;
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + periodMonths);

  await connection.execute(
    `UPDATE subscriptions 
     SET status = 'active', 
         start_date = ?, 
         end_date = ?, 
         updated_at = NOW() 
     WHERE id = ?`,
    [now, endDate, payment.sub_id]
  );

  // Выдаём доступы
  let discordGranted = false;
  let notionGranted = false;
  let googleDriveGranted = false;

  if (payment.discord_id) {
    try {
      const result = await grantRole(payment.discord_id);
      discordGranted = result.success;
    } catch (e) {
      console.error('Failed to grant Discord role:', e);
    }
  }

  if (payment.email) {
    try {
      const result = await grantAccess(payment.email, payment.user_id, payment.sub_id);
      notionGranted = result.success;
    } catch (e) {
      console.error('Failed to grant Notion access:', e);
    }
  }

  if (payment.google_drive_email) {
    try {
      const result = await grantGoogleDriveAccess(
        payment.google_drive_email,
        payment.user_id,
        payment.sub_id
      );
      googleDriveGranted = result.success;
    } catch (e) {
      console.error('Failed to grant Google Drive access:', e);
    }
  }

  // Обновляем статус выдачи доступов (добавляем поле если его нет)
  try {
    await connection.execute(
      `UPDATE subscriptions 
       SET discord_role_granted = ?, 
           notion_access_granted = ?,
           google_drive_access_granted = ? 
       WHERE id = ?`,
      [discordGranted, notionGranted, googleDriveGranted, payment.sub_id]
    );
  } catch (e: any) {
    // Если поле google_drive_access_granted не существует, добавляем его
    if (e.code === 'ER_BAD_FIELD_ERROR' || e.message?.includes('google_drive_access_granted')) {
      try {
        await connection.execute(
          `ALTER TABLE subscriptions ADD COLUMN google_drive_access_granted BOOLEAN DEFAULT FALSE`
        );
        await connection.execute(
          `UPDATE subscriptions 
           SET discord_role_granted = ?, 
               notion_access_granted = ?,
               google_drive_access_granted = ? 
           WHERE id = ?`,
          [discordGranted, notionGranted, googleDriveGranted, payment.sub_id]
        );
      } catch (alterError) {
        console.error('Failed to add google_drive_access_granted column:', alterError);
        // Обновляем без нового поля
        await connection.execute(
          `UPDATE subscriptions 
           SET discord_role_granted = ?, 
               notion_access_granted = ? 
           WHERE id = ?`,
          [discordGranted, notionGranted, payment.sub_id]
        );
      }
    } else {
      throw e;
    }
  }

  // Логируем успех
  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'payment_success', ?)`,
    [
      crypto.randomUUID(),
      payment.user_id,
      payment.sub_id,
      JSON.stringify({
        payment_id: ipnData.payment_id,
        actually_paid: ipnData.actually_paid,
        pay_currency: ipnData.pay_currency,
        discord_granted: discordGranted,
        notion_granted: notionGranted,
        google_drive_granted: googleDriveGranted,
        end_date: endDate.toISOString()
      })
    ]
  );

  // Уведомляем пользователя
  if (payment.telegram_id) {
    try {
      let accessInfo = '';
      if (discordGranted) accessInfo += '\n✅ Роль в Discord выдана';
      if (notionGranted) accessInfo += '\n✅ Доступ к Notion открыт';
      if (googleDriveGranted) accessInfo += '\n✅ Доступ к Google Drive открыт';
      
      const discordInvite = process.env.DISCORD_INVITE_URL;
      const discordButton = discordInvite ? `\n\n🎮 <a href="${discordInvite}">Перейти в Discord</a>` : '';

      await sendMessage(
        payment.telegram_id,
        `🎉 <b>Оплата прошла успешно!</b>\n\nВаша подписка активирована до <b>${endDate.toLocaleDateString('ru-RU')}</b>.\n\nСумма: <b>${ipnData.actually_paid} ${ipnData.pay_currency.toUpperCase()}</b>${accessInfo}${discordButton}`
      );
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
  }
}

// Неудачный платёж
async function handlePaymentFailed(connection: any, payment: any, ipnData: IPNPayload): Promise<void> {
  const errorMessage = ipnData.payment_status === PaymentStatuses.EXPIRED 
    ? 'Время оплаты истекло' 
    : 'Платёж не был завершён';

  await connection.execute(
    `UPDATE payments 
     SET status = 'failed', 
         error_message = ?,
         provider_data = JSON_SET(COALESCE(provider_data, '{}'), 
           '$.payment_status', ?,
           '$.payment_id', ?
         ),
         updated_at = NOW() 
     WHERE id = ?`,
    [errorMessage, ipnData.payment_status, ipnData.payment_id, payment.id]
  );

  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'payment_failed', ?)`,
    [
      crypto.randomUUID(),
      payment.user_id,
      payment.sub_id,
      JSON.stringify({
        payment_id: ipnData.payment_id,
        payment_status: ipnData.payment_status,
        error_message: errorMessage
      })
    ]
  );

  if (payment.telegram_id) {
    try {
      await sendMessage(
        payment.telegram_id,
        `❌ <b>${errorMessage}</b>\n\nВы можете попробовать оплатить снова через бота.\n\nЕсли возникли проблемы — обратитесь в поддержку.`
      );
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
  }
}

// Возврат платежа
async function handlePaymentRefunded(connection: any, payment: any, ipnData: IPNPayload): Promise<void> {
  await connection.execute(
    `UPDATE payments 
     SET status = 'refunded', 
         provider_data = JSON_SET(COALESCE(provider_data, '{}'), 
           '$.payment_status', ?,
           '$.payment_id', ?
         ),
         updated_at = NOW() 
     WHERE id = ?`,
    [ipnData.payment_status, ipnData.payment_id, payment.id]
  );

  // Отменяем подписку
  await connection.execute(
    `UPDATE subscriptions 
     SET status = 'cancelled', 
         updated_at = NOW() 
     WHERE id = ?`,
    [payment.sub_id]
  );

  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'payment_refunded', ?)`,
    [
      crypto.randomUUID(),
      payment.user_id,
      payment.sub_id,
      JSON.stringify({ payment_id: ipnData.payment_id })
    ]
  );

  if (payment.telegram_id) {
    try {
      await sendMessage(
        payment.telegram_id,
        `💰 <b>Возврат средств</b>\n\nВаш платёж был возвращён. Подписка отменена.`
      );
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
  }
}

// Частичная оплата
async function handlePartialPayment(connection: any, payment: any, ipnData: IPNPayload): Promise<void> {
  await connection.execute(
    `UPDATE payments 
     SET provider_data = JSON_SET(COALESCE(provider_data, '{}'), 
         '$.payment_status', ?,
         '$.payment_id', ?,
         '$.actually_paid', ?
       ),
       updated_at = NOW() 
     WHERE id = ?`,
    [ipnData.payment_status, ipnData.payment_id, ipnData.actually_paid, payment.id]
  );

  await connection.execute(
    `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
     VALUES (?, ?, ?, 'payment_partial', ?)`,
    [
      crypto.randomUUID(),
      payment.user_id,
      payment.sub_id,
      JSON.stringify({
        payment_id: ipnData.payment_id,
        actually_paid: ipnData.actually_paid,
        price_amount: ipnData.price_amount
      })
    ]
  );

  if (payment.telegram_id) {
    try {
      const remaining = (ipnData.price_amount - ipnData.actually_paid).toFixed(2);
      await sendMessage(
        payment.telegram_id,
        `⚠️ <b>Частичная оплата</b>\n\nПолучено: <b>${ipnData.actually_paid} ${ipnData.pay_currency.toUpperCase()}</b>\nОсталось: <b>${remaining} USD</b>\n\nПожалуйста, доплатите оставшуюся сумму на тот же адрес.`
      );
    } catch (e) {
      console.error('Failed to send Telegram notification:', e);
    }
  }
}

// GET для проверки webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'NOWPayments webhook endpoint',
    timestamp: new Date().toISOString()
  });
}
