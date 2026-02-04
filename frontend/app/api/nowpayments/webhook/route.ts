import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { PaymentStatuses, IPNPayload } from '@/lib/nowpayments';
import { grantRole } from '@/lib/discord-bot';
import { grantAccess } from '@/lib/notion';
import { grantAccess as grantGoogleDriveAccess } from '@/lib/google-drive';
import { sendMessage } from '@/lib/telegram-bot';
import { sendTelegramMessageToAll } from '@/lib/telegram';
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
    const statusLower = (ipnData.payment_status || '').toLowerCase();

    console.log('[NOWPayments Webhook] IPN Data:', {
      payment_id: ipnData.payment_id,
      invoice_id: ipnData.invoice_id,
      payment_status: ipnData.payment_status,
      status_normalized: statusLower,
      order_id: ipnData.order_id,
      actually_paid: ipnData.actually_paid,
      price_amount: ipnData.price_amount
    });

    const connection = await getConnection();
    try {
      const externalId = ipnData.invoice_id?.toString() || ipnData.payment_id?.toString();
      const invoiceIdParam = ipnData.invoice_id != null ? String(ipnData.invoice_id) : null;

      const paymentIdParam = ipnData.payment_id != null ? String(ipnData.payment_id) : null;
      let payments: any[];
      const [paymentsRows] = await connection.execute(
        `SELECT p.*, s.user_id, s.id as sub_id, s.period_months, 
                u.discord_id, u.email, u.google_drive_email, u.telegram_id,
                u.telegram_username, u.telegram_first_name
         FROM payments p 
         LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci
         LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
         WHERE p.external_id = ? 
            OR JSON_UNQUOTE(JSON_EXTRACT(p.provider_data, '$.invoice_id')) = ?
            OR JSON_UNQUOTE(JSON_EXTRACT(p.provider_data, '$.payment_id')) = ?`,
        [externalId, invoiceIdParam ?? externalId, paymentIdParam ?? '']
      );
      payments = paymentsRows as any[];

      if (payments.length === 0 && ipnData.order_id) {
        const [byOrderRows] = await connection.execute(
          `SELECT p.*, s.user_id, s.id as sub_id, s.period_months, 
                  u.discord_id, u.email, u.google_drive_email, u.telegram_id,
                  u.telegram_username, u.telegram_first_name
           FROM payments p 
           LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci
           LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
           WHERE JSON_UNQUOTE(JSON_EXTRACT(p.provider_data, '$.order_id')) = ?`,
          [ipnData.order_id]
        );
        payments = byOrderRows as any[];
        if (payments.length > 0) {
          console.log('[NOWPayments Webhook] Payment found by order_id:', ipnData.order_id);
        }
      }

      if (payments.length === 0 && paymentIdParam) {
        const [byPaymentIdRows] = await connection.execute(
          `SELECT p.*, s.user_id, s.id as sub_id, s.period_months, 
                  u.discord_id, u.email, u.google_drive_email, u.telegram_id,
                  u.telegram_username, u.telegram_first_name
           FROM payments p 
           LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci
           LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
           WHERE p.external_id = ?`,
          [paymentIdParam]
        );
        payments = byPaymentIdRows as any[];
        if (payments.length > 0) {
          console.log('[NOWPayments Webhook] Payment found by payment_id as external_id:', paymentIdParam);
        }
      }

      if (payments.length === 0) {
        console.warn('[NOWPayments Webhook] Payment not found for external_id=%s order_id=%s payment_id=%s', externalId, ipnData.order_id, paymentIdParam);
        return NextResponse.json({ received: true, status: 'payment_not_found' });
      }

      const payment = payments[0];

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

      // Обрабатываем статусы платежа (нормализуем к нижнему регистру — NOWPayments может слать "Finished" и т.д.)
      switch (statusLower) {
        case PaymentStatuses.FINISHED:
          console.log('[NOWPayments Webhook] Processing FINISHED for payment id=%s', payment.id);
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
          if (payment.telegram_id && statusLower === PaymentStatuses.CONFIRMING) {
            try {
              await sendMessage(
                Number(payment.telegram_id),
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

// Успешный платёж (экспорт для ручного подтверждения через /api/nowpayments/confirm-payment)
export async function handlePaymentSuccess(connection: any, payment: any, ipnData: IPNPayload): Promise<void> {
  if (payment.status === 'completed') {
    console.log(`Payment ${payment.id} already completed`);
    return;
  }

  // Определяем тип операции (покупка / продление), даты подписки и название тарифа для уведомления 2FA
  let tariffName = '';
  let isRenewal = false;
  let currentEndDate: Date | null = null;
  try {
    const [subRows] = await connection.execute(
      'SELECT status, tariff_id, end_date FROM subscriptions WHERE id = ?',
      [payment.sub_id]
    );
    const sub = (subRows as any[])[0];
    if (sub) {
      isRenewal = sub.status === 'active';
      if (sub.end_date) currentEndDate = new Date(sub.end_date);
      if (sub.tariff_id) {
        const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [sub.tariff_id]);
        tariffName = (tRows as any[])[0]?.name || String(sub.tariff_id);
      }
    }
  } catch (e) {
    console.error('Error fetching subscription/tariff for admin notification:', e);
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

  // Активируем подписку или продлеваем её
  const now = new Date();
  let providerData: Record<string, unknown> = {};
  if (payment.provider_data) {
    try {
      providerData = typeof payment.provider_data === 'string' ? JSON.parse(payment.provider_data) : payment.provider_data as Record<string, unknown>;
    } catch (_) {}
  }
  const periodMonths = (providerData as any).period_months != null ? Number((providerData as any).period_months) : (payment.period_months || 1);
  // При продлении: новая дата окончания = от текущей даты окончания подписки (или от сегодня, если уже истекла)
  const baseDate =
    isRenewal && currentEndDate
      ? new Date(Math.max(currentEndDate.getTime(), now.getTime()))
      : now;
  const endDate = new Date(baseDate);
  endDate.setMonth(endDate.getMonth() + periodMonths);

  // Получаем информацию о промокоде и дополнительные дни, если есть
  let extraDays = 0;
  try {
    const [promocodeUsages] = await connection.execute(
      `SELECT pr.extra_days 
       FROM promocode_usages pu
       JOIN promocodes pr ON pu.promocode_id = pr.id
       WHERE pu.subscription_id = ?`,
      [payment.sub_id]
    );

    if ((promocodeUsages as any[]).length > 0) {
      const promocode = (promocodeUsages as any[])[0];
      if (promocode.extra_days) {
        try {
          const extraDaysMap = typeof promocode.extra_days === 'string'
            ? JSON.parse(promocode.extra_days)
            : promocode.extra_days;
          if (extraDaysMap && typeof extraDaysMap === 'object') {
            const periodKey = String(periodMonths);
            if (extraDaysMap[periodKey]) {
              extraDays = parseInt(String(extraDaysMap[periodKey])) || 0;
            }
          }
        } catch (e) {
          console.error('Error parsing extra_days from promocode:', e);
        }
      }
    }
  } catch (e) {
    console.error('Error fetching promocode extra_days:', e);
  }

  if (extraDays > 0) {
    endDate.setDate(endDate.getDate() + extraDays);
    console.log(`[NOWPayments Webhook] Added ${extraDays} extra days to subscription ${payment.sub_id} for period ${periodMonths} months`);
  }

  if (isRenewal) {
    // Продление: только сдвигаем end_date, start_date не трогаем
    await connection.execute(
      `UPDATE subscriptions 
       SET status = 'active', 
           end_date = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [endDate, payment.sub_id]
    );
    console.log(`[NOWPayments Webhook] Subscription ${payment.sub_id} renewed: end_date extended to ${endDate.toISOString()}`);
  } else {
    // Новая покупка: выставляем start_date и end_date от текущего момента
    await connection.execute(
      `UPDATE subscriptions 
       SET status = 'active', 
           start_date = ?, 
           end_date = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [now, endDate, payment.sub_id]
    );
  }

  // Выдаём доступы
  let discordGranted = false;
  let notionGranted = false;
  let googleDriveGranted = false;

  if (payment.discord_id) {
    try {
      // При продлении не отправляем ЛС в Discord — только при первой выдаче (покупка) или при отзыве (истечение)
      const result = await grantRole(payment.discord_id, { sendNotification: !isRenewal });
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

  // Уведомляем пользователя в Telegram (обязательно число для chat_id)
  const telegramId = payment.telegram_id != null ? Number(payment.telegram_id) : null;
  if (telegramId) {
    try {
      let accessInfo = '';
      if (discordGranted) accessInfo += '\n✅ Роль в Discord выдана';
      if (notionGranted) accessInfo += '\n✅ Доступ к Notion открыт';
      if (googleDriveGranted) accessInfo += '\n✅ Доступ к Google Drive открыт';
      if (isRenewal) {
        // Продление — без доп. текста про Notion
      } else {
        accessInfo += '\n\n📋 Доступ в Notion будет выдан в течение 12 часов. Если возникнут проблемы — пишите в /help';
      }

      const discordInvite = process.env.DISCORD_INVITE_URL;
      const discordButton = discordInvite ? `\n\n🎮 <a href="${discordInvite}">Перейти в Discord</a>` : '';

      const userMessage = `🎉 <b>Оплата прошла успешно!</b>\n\nВаша подписка активирована до <b>${endDate.toLocaleDateString('ru-RU')}</b>.\n\nСумма: <b>${ipnData.actually_paid} ${(ipnData.pay_currency || '').toUpperCase()}</b>${accessInfo}${discordButton}`;
      await sendMessage(telegramId, userMessage);
      console.log('[NOWPayments Webhook] User notification sent to telegram_id=%s', telegramId);
    } catch (e) {
      console.error('[NOWPayments Webhook] Failed to send Telegram notification:', e);
    }
  } else {
    console.warn('[NOWPayments Webhook] No telegram_id for user_id=%s, skipping user notification', payment.user_id);
  }

  // Уведомляем администраторов через 2FA бота (разный формат для продления и новой покупки)
  try {
    const userInfo = payment.telegram_username
      ? `@${payment.telegram_username}`
      : payment.telegram_first_name || `ID: ${payment.telegram_id}`;
    const fromDateStr = baseDate.toLocaleDateString('ru-RU');
    const toDateStr = endDate.toLocaleDateString('ru-RU');
    const amountStr = `${ipnData.actually_paid} ${(ipnData.pay_currency || '').toUpperCase()}`;

    let adminMessage: string;
    if (isRenewal) {
      adminMessage = `
🔄 *Подписка продлена*

*Дата продления:* от ${fromDateStr} до ${toDateStr}
*Тариф:* ${tariffName || '—'}
*Сумма оплаты:* ${amountStr}

*Пользователь:* ${userInfo}
*Telegram ID:* \`${payment.telegram_id}\`

Доступы в Discord, Notion и Google Drive *активны* (продление без повторной выдачи).

Спасибо, что вы с нами 🙏
      `.trim();
    } else {
      let accessInfo = '';
      if (discordGranted) accessInfo += '\n✅ Discord роль выдана';
      if (notionGranted) accessInfo += '\n✅ Notion доступ открыт';
      if (googleDriveGranted) accessInfo += '\n✅ Google Drive доступ открыт';
      if (!discordGranted && !notionGranted && !googleDriveGranted) {
        accessInfo = '\n⚠️ Доступы не выданы (нет данных пользователя)';
      }
      const periodLabel = periodMonths === 1 ? 'месяц' : periodMonths < 5 ? 'месяца' : 'месяцев';
      adminMessage = `
💰 *Новая оплата подписки*

*Пользователь:* ${userInfo}
*Telegram ID:* \`${payment.telegram_id}\`
*Имя:* ${payment.telegram_first_name || '—'}
*Email (Notion):* ${payment.email ? `\`${payment.email}\`` : '—'}
*Email (Google Drive):* ${payment.google_drive_email ? `\`${payment.google_drive_email}\`` : '—'}
*Discord ID:* ${payment.discord_id ? `\`${payment.discord_id}\`` : '—'}

*Тариф:* ${tariffName || '—'}
*Сумма:* ${amountStr}
*Период:* ${periodMonths} ${periodLabel}
*Подписка до:* ${toDateStr}${accessInfo}

*Payment ID:* \`${ipnData.payment_id}\`
*Время:* ${new Date().toLocaleString('ru-RU')}
      `.trim();
    }

    await sendTelegramMessageToAll(adminMessage);

    // Запрос на ручное добавление email в Notion только при новой покупке (при продлении не просим — доступ уже есть)
    if (!isRenewal && payment.email && payment.email.trim()) {
      const notionRequest = `
📋 *Notion: добавить вручную*

Добавьте в Notion гостя с email:
\`${payment.email.trim()}\`

Пользователь: ${userInfo} (TG ID: \`${payment.telegram_id}\`)
Тариф: ${tariffName || '—'}
      `.trim();
      await sendTelegramMessageToAll(notionRequest).catch((err) =>
        console.error('Failed to send Notion manual-add request to 2FA:', err)
      );
    }
  } catch (e) {
    console.error('Failed to send admin notification:', e);
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

  const failedTelegramId = payment.telegram_id != null ? Number(payment.telegram_id) : null;
  if (failedTelegramId) {
    try {
      await sendMessage(
        failedTelegramId,
        `❌ <b>${errorMessage}</b>\n\nВы можете попробовать оплатить снова через бота.\n\nЕсли возникли проблемы — обратитесь в поддержку.`
      );
    } catch (e) {
      console.error('[NOWPayments Webhook] Failed to send failure notification:', e);
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

  const refundTelegramId = payment.telegram_id != null ? Number(payment.telegram_id) : null;
  if (refundTelegramId) {
    try {
      await sendMessage(
        refundTelegramId,
        `💰 <b>Возврат средств</b>\n\nВаш платёж был возвращён. Подписка отменена.`
      );
    } catch (e) {
      console.error('[NOWPayments Webhook] Failed to send refund notification:', e);
    }
  }

  // Уведомление в 2FA: подписка отменена (возврат), данные пользователя и почта для отзыва доступа Notion
  try {
    let tariffName = '';
    const [subRows] = await connection.execute(
      'SELECT tariff_id FROM subscriptions WHERE id = ?',
      [payment.sub_id]
    );
    const sub = (subRows as any[])[0];
    if (sub?.tariff_id) {
      const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [sub.tariff_id]);
      tariffName = (tRows as any[])[0]?.name || String(sub.tariff_id);
    }
    const userInfo = payment.telegram_username
      ? `@${payment.telegram_username}`
      : payment.telegram_first_name || `ID: ${payment.telegram_id}`;
    const whenStr = new Date().toLocaleString('ru-RU');
    const adminMessage = `
🔄 *Подписка отменена (возврат)*

*Пользователь:* ${userInfo}
*Telegram ID:* \`${payment.telegram_id}\`
*Имя:* ${payment.telegram_first_name || '—'}
*Тариф:* ${tariffName || '—'}
*Когда:* ${whenStr}

*Email (Notion) — отозвать доступ вручную:* ${payment.email ? `\`${payment.email}\`` : '—'}
*Email (Google Drive):* ${payment.google_drive_email ? `\`${payment.google_drive_email}\`` : '—'}
*Discord ID:* ${payment.discord_id ? `\`${payment.discord_id}\`` : '—'}
    `.trim();
    await sendTelegramMessageToAll(adminMessage);
  } catch (e) {
    console.error('Failed to send admin refund notification:', e);
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

  const partialTelegramId = payment.telegram_id != null ? Number(payment.telegram_id) : null;
  if (partialTelegramId) {
    try {
      const remaining = (ipnData.price_amount - ipnData.actually_paid).toFixed(2);
      await sendMessage(
        partialTelegramId,
        `⚠️ <b>Частичная оплата</b>\n\nПолучено: <b>${ipnData.actually_paid} ${(ipnData.pay_currency || '').toUpperCase()}</b>\nОсталось: <b>${remaining} USD</b>\n\nПожалуйста, доплатите оставшуюся сумму на тот же адрес.`
      );
    } catch (e) {
      console.error('[NOWPayments Webhook] Failed to send partial payment notification:', e);
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
