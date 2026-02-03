import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { grantRole, revokeRole } from '@/lib/discord-bot';
import { grantAccess, revokeAccess } from '@/lib/notion';
import { grantAccess as grantGoogleDriveAccess, revokeAccess as revokeGoogleDriveAccess } from '@/lib/google-drive';
import { sendTelegramMessageToAll } from '@/lib/telegram';
import { sendExpiredNotificationToUser, sendExpiringInDaysNotification } from '@/lib/subscription-notifications';
import crypto from 'crypto';

/** Приводит ISO-дату или Date к формату MySQL DATETIME (YYYY-MM-DD HH:MM:SS) */
function toMySQLDateTime(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

// GET /api/subscriptions/[id] - детали подписки
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(`
      SELECT 
        s.*,
        u.id as user_db_id,
        u.telegram_id,
        u.telegram_username,
        u.telegram_first_name,
        u.telegram_last_name,
        u.discord_id,
        u.discord_username,
        u.email
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      WHERE s.id = ?
    `, [id]);

    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const row = (rows as any[])[0];

    // Получаем историю платежей
    const [payments] = await connection.execute(`
      SELECT * FROM payments WHERE subscription_id = ? ORDER BY created_at DESC
    `, [id]);

    // Получаем логи
    const [logs] = await connection.execute(`
      SELECT * FROM subscription_logs WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 50
    `, [id]);

    return NextResponse.json({
      id: row.id,
      userId: row.user_id,
      pricingId: row.pricing_id,
      periodMonths: row.period_months,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      isFree: Boolean(row.is_free),
      discordRoleGranted: Boolean(row.discord_role_granted),
      notionAccessGranted: Boolean(row.notion_access_granted),
      autoRenew: Boolean(row.auto_renew),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_db_id,
        telegramId: row.telegram_id,
        telegramUsername: row.telegram_username,
        telegramFirstName: row.telegram_first_name,
        telegramLastName: row.telegram_last_name,
        discordId: row.discord_id,
        discordUsername: row.discord_username,
        email: row.email
      },
      payments: (payments as any[]).map(p => ({
        id: p.id,
        amount: parseFloat(p.amount),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.payment_method,
        externalId: p.external_id,
        paidAt: p.paid_at,
        createdAt: p.created_at
      })),
      logs: (logs as any[]).map(l => ({
        id: l.id,
        action: l.action,
        details: l.details ? JSON.parse(l.details) : null,
        createdAt: l.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/subscriptions/[id] - обновить подписку
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const data = await request.json();
  const connection = await getConnection();

  try {
    // Колонка is_free может отсутствовать в старых БД
    try {
      const [col] = await connection.execute(`
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'is_free'
      `);
      if ((col as any[]).length === 0) {
        await connection.execute(`ALTER TABLE subscriptions ADD COLUMN is_free TINYINT(1) DEFAULT 0`);
      }
    } catch (e) {
      // Игнорируем
    }

    // Проверяем существование подписки (COLLATE устраняет смешение коллаций utf8mb4_unicode_ci / utf8mb4_0900_ai_ci)
    const [existing] = await connection.execute(`
      SELECT s.*, u.discord_id, u.email, u.google_drive_email, u.telegram_id, u.telegram_username, u.telegram_first_name
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      WHERE s.id = ?
    `, [id]);

    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const subscription = (existing as any[])[0];
    const oldStatus = subscription.status;
    const newStatus = data.status || oldStatus;

    // Обновляем подписку (mysql2 не принимает undefined — передаём null для «не менять»; даты — в формате MySQL)
    const statusVal = data.status !== undefined ? data.status : null;
    const startDateVal = data.startDate !== undefined ? toMySQLDateTime(data.startDate) : null;
    const endDateVal = data.endDate !== undefined ? toMySQLDateTime(data.endDate) : null;
    const discordRoleVal = data.discordRoleGranted !== undefined ? data.discordRoleGranted : null;
    const notionAccessVal = data.notionAccessGranted !== undefined ? data.notionAccessGranted : null;
    const autoRenewVal = data.autoRenew !== undefined ? data.autoRenew : null;
    const notesVal = data.notes !== undefined ? data.notes : null;
    const isFreeVal = data.isFree !== undefined ? data.isFree : null;

    await connection.execute(`
      UPDATE subscriptions SET
        status = COALESCE(?, status),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        discord_role_granted = COALESCE(?, discord_role_granted),
        notion_access_granted = COALESCE(?, notion_access_granted),
        auto_renew = COALESCE(?, auto_renew),
        notes = COALESCE(?, notes),
        is_free = COALESCE(?, is_free),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      statusVal,
      startDateVal,
      endDateVal,
      discordRoleVal,
      notionAccessVal,
      autoRenewVal,
      notesVal,
      isFreeVal !== null ? (isFreeVal ? 1 : 0) : null,
      id
    ]);

    // Логируем изменение
    await connection.execute(
      `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
       VALUES (?, ?, ?, 'subscription_updated', ?)`,
      [
        crypto.randomUUID(), 
        subscription.user_id, 
        id, 
        JSON.stringify({ 
          changes: data,
          oldStatus,
          newStatus 
        })
      ]
    );

    // Обрабатываем изменение статуса
    if (oldStatus !== newStatus) {
      // Если подписка стала активной - выдаём доступы
      if (newStatus === 'active' && oldStatus !== 'active') {
        // Проверяем, это продление или новая активация
        const isRenewal = oldStatus === 'expired' || oldStatus === 'cancelled';
        if (subscription.discord_id && !subscription.discord_role_granted) {
          const discordResult = await grantRole(subscription.discord_id);
          if (discordResult.success) {
            await connection.execute(
              'UPDATE subscriptions SET discord_role_granted = TRUE WHERE id = ?',
              [id]
            );
          }
        }

        if (subscription.email && !subscription.notion_access_granted) {
          const notionResult = await grantAccess(subscription.email, subscription.user_id, id);
          if (notionResult.success) {
            await connection.execute(
              'UPDATE subscriptions SET notion_access_granted = TRUE WHERE id = ?',
              [id]
            );
          }
        }

        if (subscription.google_drive_email) {
          try {
            const googleDriveResult = await grantGoogleDriveAccess(
              subscription.google_drive_email,
              subscription.user_id,
              id
            );
            if (googleDriveResult.success) {
              try {
                await connection.execute(
                  'UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?',
                  [id]
                );
              } catch (e: any) {
                // Если поле не существует, добавляем его
                if (e.code === 'ER_BAD_FIELD_ERROR') {
                  await connection.execute(
                    'ALTER TABLE subscriptions ADD COLUMN google_drive_access_granted BOOLEAN DEFAULT FALSE'
                  );
                  await connection.execute(
                    'UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?',
                    [id]
                  );
                }
              }
            }
          } catch (e) {
            console.error('Failed to grant Google Drive access:', e);
          }
        }

        // Уведомляем администраторов о продлении/активации подписки (вся необходимая информация)
        try {
          let tariffName = '';
          if (subscription.tariff_id) {
            const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [subscription.tariff_id]);
            tariffName = (tRows as any[])[0]?.name || String(subscription.tariff_id);
          }
          const userInfo = subscription.telegram_username
            ? `@${subscription.telegram_username}`
            : subscription.telegram_first_name || `ID: ${subscription.telegram_id || 'N/A'}`;
          const finalEndDate = endDateVal || subscription.end_date;
          const finalStartDate = startDateVal || subscription.start_date;
          const endDateStr = finalEndDate ? new Date(finalEndDate).toLocaleDateString('ru-RU') : 'не указана';
          const startDateStr = finalStartDate ? new Date(finalStartDate).toLocaleDateString('ru-RU') : 'не указана';
          const header = isRenewal ? '🔄 *Подписка продлена*' : '✅ *Подписка активирована*';
          const adminMessage = `
${header}

*Пользователь:* ${userInfo}
*Telegram ID:* \`${subscription.telegram_id || 'N/A'}\`
*Имя:* ${subscription.telegram_first_name || '—'}
*Тариф:* ${tariffName || '—'}
*Статус:* ${oldStatus} → ${newStatus}
*Начало:* ${startDateStr}
*Окончание:* ${endDateStr}

*Email (Notion):* ${subscription.email ? `\`${subscription.email}\`` : '—'}
*Email (Google Drive):* ${subscription.google_drive_email ? `\`${subscription.google_drive_email}\`` : '—'}
*Discord ID:* ${subscription.discord_id ? `\`${subscription.discord_id}\`` : '—'}

*Время:* ${new Date().toLocaleString('ru-RU')}
          `.trim();
          await sendTelegramMessageToAll(adminMessage);
        } catch (e) {
          console.error('Failed to send subscription activation notification:', e);
        }
      }

      // Если подписка стала неактивной - забираем доступы
      if ((newStatus === 'expired' || newStatus === 'cancelled') && 
          (oldStatus === 'active' || oldStatus === 'pending')) {
        if (subscription.discord_id && subscription.discord_role_granted) {
          await revokeRole(subscription.discord_id);
          await connection.execute(
            'UPDATE subscriptions SET discord_role_granted = FALSE WHERE id = ?',
            [id]
          );
        }

        if (subscription.email && subscription.notion_access_granted) {
          await revokeAccess(subscription.email);
          await connection.execute(
            'UPDATE subscriptions SET notion_access_granted = FALSE WHERE id = ?',
            [id]
          );
        }

        if (subscription.google_drive_email) {
          try {
            await revokeGoogleDriveAccess(subscription.google_drive_email);
            try {
              await connection.execute(
                'UPDATE subscriptions SET google_drive_access_granted = FALSE WHERE id = ?',
                [id]
              );
            } catch (e: any) {
              // Если поле не существует, игнорируем
              if (e.code !== 'ER_BAD_FIELD_ERROR') {
                console.error('Failed to update google_drive_access_granted:', e);
              }
            }
          } catch (e) {
            console.error('Failed to revoke Google Drive access:', e);
          }
        }

        // Уведомляем пользователя в Telegram и Discord (как при естественном истечении)
        try {
          await sendExpiredNotificationToUser(connection, subscription);
        } catch (e) {
          console.error('Failed to send expired notification to user:', e);
        }

        // Уведомляем администраторов о деактивации подписки (тариф, почта для отзыва Notion)
        try {
          let tariffName = '';
          if (subscription.tariff_id) {
            const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [subscription.tariff_id]);
            tariffName = (tRows as any[])[0]?.name || String(subscription.tariff_id);
          }
          const userInfo = subscription.telegram_username
            ? `@${subscription.telegram_username}`
            : subscription.telegram_first_name || `ID: ${subscription.telegram_id || 'N/A'}`;
          const finalEndDate = endDateVal || subscription.end_date;
          const endDateStr = finalEndDate ? new Date(finalEndDate).toLocaleDateString('ru-RU') : 'не указана';
          const statusLabel = newStatus === 'expired' ? 'истекла' : 'отменена';
          const adminMessage = `
❌ *Подписка ${statusLabel}*

*Пользователь:* ${userInfo}
*Telegram ID:* \`${subscription.telegram_id || 'N/A'}\`
*Имя:* ${subscription.telegram_first_name || '—'}
*Тариф:* ${tariffName || '—'}
*Статус:* ${oldStatus} → ${newStatus}
*Окончание:* ${endDateStr}

*Email (Notion) — отозвать доступ вручную:* ${subscription.email ? `\`${subscription.email}\`` : '—'}
*Email (Google Drive):* ${subscription.google_drive_email ? `\`${subscription.google_drive_email}\`` : '—'}
*Discord ID:* ${subscription.discord_id ? `\`${subscription.discord_id}\`` : '—'}

*Время:* ${new Date().toLocaleString('ru-RU')}
          `.trim();
          await sendTelegramMessageToAll(adminMessage);
        } catch (e) {
          console.error('Failed to send subscription deactivation notification:', e);
        }
      }
    }

    // Админ поставил дату окончания в прошлое — считаем подписку истекшей, забираем доступы и уведомляем пользователя
    const finalEndDate = endDateVal ?? subscription.end_date;
    const now = new Date();
    if (
      endDateVal != null &&
      new Date(endDateVal) < now &&
      oldStatus === 'active' &&
      (data.status === undefined || data.status === 'active')
    ) {
      await connection.execute(
        `UPDATE subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
      if (subscription.discord_id && subscription.discord_role_granted) {
        try {
          await revokeRole(subscription.discord_id);
          await connection.execute('UPDATE subscriptions SET discord_role_granted = FALSE WHERE id = ?', [id]);
        } catch (e) {
          console.error('Failed to revoke Discord role:', e);
        }
      }
      if (subscription.email && subscription.notion_access_granted) {
        try {
          await revokeAccess(subscription.email);
          await connection.execute('UPDATE subscriptions SET notion_access_granted = FALSE WHERE id = ?', [id]);
        } catch (e) {
          console.error('Failed to revoke Notion access:', e);
        }
      }
      if (subscription.google_drive_email) {
        try {
          await revokeGoogleDriveAccess(subscription.google_drive_email);
          try {
            await connection.execute('UPDATE subscriptions SET google_drive_access_granted = FALSE WHERE id = ?', [id]);
          } catch (e: any) {
            if (e?.code !== 'ER_BAD_FIELD_ERROR') console.error('Failed to update google_drive_access_granted:', e);
          }
        } catch (e) {
          console.error('Failed to revoke Google Drive access:', e);
        }
      }
      try {
        await sendExpiredNotificationToUser(connection, subscription);
      } catch (e) {
        console.error('Failed to send expired notification to user:', e);
      }
      try {
        let tariffName = '';
        if (subscription.tariff_id) {
          const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [subscription.tariff_id]);
          tariffName = (tRows as any[])[0]?.name || String(subscription.tariff_id);
        }
        const userInfo = subscription.telegram_username ? `@${subscription.telegram_username}` : subscription.telegram_first_name || `ID: ${subscription.telegram_id || 'N/A'}`;
        const endDateStr = finalEndDate ? new Date(finalEndDate).toLocaleDateString('ru-RU') : 'не указана';
        const adminMessage = `
❌ *Подписка истекла (дата изменена админом)*

*Пользователь:* ${userInfo}
*Telegram ID:* \`${subscription.telegram_id || 'N/A'}\`
*Имя:* ${subscription.telegram_first_name || '—'}
*Тариф:* ${tariffName || '—'}
*Окончание:* ${endDateStr}

*Email (Notion) — отозвать доступ вручную:* ${subscription.email ? `\`${subscription.email}\`` : '—'}
*Email (Google Drive):* ${subscription.google_drive_email ? `\`${subscription.google_drive_email}\`` : '—'}
*Discord ID:* ${subscription.discord_id ? `\`${subscription.discord_id}\`` : '—'}

*Время:* ${now.toLocaleString('ru-RU')}
        `.trim();
        await sendTelegramMessageToAll(adminMessage);
      } catch (e) {
        console.error('Failed to send admin notification:', e);
      }
    }

    // Админ поставил дату окончания в будущее — при необходимости отправляем уведомление «осталось N дней»
    if (endDateVal != null) {
      const endAsDate = new Date(endDateVal);
      if (endAsDate > now) {
        const daysLeft = Math.ceil((endAsDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysLeft >= 1 && daysLeft <= 31) {
          try {
            await sendExpiringInDaysNotification(
              connection,
              { id, user_id: subscription.user_id, end_date: endDateVal, telegram_id: subscription.telegram_id },
              daysLeft
            );
          } catch (e) {
            console.error('Failed to send expiring-in-days notification:', e);
          }
        }
      }
    }

    return NextResponse.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/subscriptions/[id] - удалить подписку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const connection = await getConnection();

  try {
    // Проверяем существование
    const [existing] = await connection.execute(
      'SELECT id FROM subscriptions WHERE id = ?',
      [id]
    );

    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Удаляем связанные записи (каскадно через FK)
    await connection.execute('DELETE FROM subscriptions WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  } finally {
    connection.release();
  }
}
