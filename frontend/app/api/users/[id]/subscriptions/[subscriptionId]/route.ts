import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { revokeRole } from '@/lib/discord-bot';
import { revokeAccess } from '@/lib/notion';
import { revokeAccess as revokeGoogleDriveAccess } from '@/lib/google-drive';
import { sendTelegramMessageToAll } from '@/lib/telegram';
import { userHasOtherActiveSubscription } from '@/lib/subscription-notifications';

// DELETE /api/users/[id]/subscriptions/[subscriptionId] - отменить подписку
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subscriptionId: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id: userId, subscriptionId } = await params;
  const connection = await getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT s.id, s.status, s.user_id, s.tariff_id, s.end_date, s.discord_role_granted, s.notion_access_granted, s.google_drive_access_granted,
              u.telegram_id, u.telegram_username, u.telegram_first_name, u.email, u.google_drive_email, u.discord_id
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.user_id = ?`,
      [subscriptionId, userId]
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Подписка не найдена' }, { status: 404 });
    }

    const sub = (rows as any[])[0];

    const hasOtherActive = await userHasOtherActiveSubscription(connection, userId, subscriptionId);

    // Отменяем подписку
    await connection.execute(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [subscriptionId]
    );

    // Отзываем доступы только если у пользователя нет другой активной подписки
    if (!hasOtherActive) {
      if (sub.discord_id && sub.discord_role_granted) {
        try {
          await revokeRole(sub.discord_id);
          await connection.execute('UPDATE subscriptions SET discord_role_granted = FALSE WHERE id = ?', [subscriptionId]);
        } catch (e) {
          console.error('Failed to revoke Discord role:', e);
        }
      }
      if (sub.email && sub.notion_access_granted) {
        try {
          await revokeAccess(sub.email);
          await connection.execute('UPDATE subscriptions SET notion_access_granted = FALSE WHERE id = ?', [subscriptionId]);
        } catch (e) {
          console.error('Failed to revoke Notion access:', e);
        }
      }
      if (sub.google_drive_email) {
        try {
          await revokeGoogleDriveAccess(sub.google_drive_email);
          try {
            await connection.execute('UPDATE subscriptions SET google_drive_access_granted = FALSE WHERE id = ?', [subscriptionId]);
          } catch (e: any) {
            if (e?.code !== 'ER_BAD_FIELD_ERROR') console.error('Failed to update google_drive_access_granted:', e);
          }
        } catch (e) {
          console.error('Failed to revoke Google Drive access:', e);
        }
      }
    }

    // Уведомление в 2FA: подписка отменена
    try {
      let tariffName = '';
      if (sub.tariff_id) {
        const [tRows] = await connection.execute('SELECT name FROM tariffs WHERE id = ?', [sub.tariff_id]);
        tariffName = (tRows as any[])[0]?.name || String(sub.tariff_id);
      }
      const userInfo = sub.telegram_username ? `@${sub.telegram_username}` : sub.telegram_first_name || `ID: ${sub.telegram_id || 'N/A'}`;
      const endDateStr = sub.end_date ? new Date(sub.end_date).toLocaleDateString('ru-RU') : '—';
      const skipNote = hasOtherActive ? '\n\n_У пользователя есть другая активная подписка — доступы не снимались._' : '';
      const adminMessage = `
🔄 *Подписка отменена (админ/API)*

*Пользователь:* ${userInfo}
*Telegram ID:* \`${sub.telegram_id || 'N/A'}\`
*Имя:* ${sub.telegram_first_name || '—'}
*Тариф:* ${tariffName || '—'}
*Окончание было:* ${endDateStr}
*Когда:* ${new Date().toLocaleString('ru-RU')}

*Email (Notion) — отозвать доступ вручную:* ${sub.email ? `\`${sub.email}\`` : '—'}
*Email (Google Drive):* ${sub.google_drive_email ? `\`${sub.google_drive_email}\`` : '—'}
*Discord ID:* ${sub.discord_id ? `\`${sub.discord_id}\`` : '—'}${skipNote}
      `.trim();
      await sendTelegramMessageToAll(adminMessage);
    } catch (e) {
      console.error('Failed to send admin cancellation notification:', e);
    }

    return NextResponse.json({ message: 'Подписка отменена' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Не удалось отменить подписку' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/users/[id]/subscriptions/[subscriptionId] - обновить подписку
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subscriptionId: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id: userId, subscriptionId } = await params;
  const data = await request.json();
  const connection = await getConnection();

  try {
    // Проверяем существует ли подписка и принадлежит ли она пользователю
    const [subscriptions] = await connection.execute(
      'SELECT id FROM subscriptions WHERE id = ? AND user_id = ?',
      [subscriptionId, userId]
    );

    if ((subscriptions as any[]).length === 0) {
      return NextResponse.json({ error: 'Подписка не найдена' }, { status: 404 });
    }

    // Обновляем подписку
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.endDate !== undefined) {
      updates.push('end_date = ?');
      values.push(new Date(data.endDate));
    }
    if (data.discordRoleGranted !== undefined) {
      updates.push('discord_role_granted = ?');
      values.push(data.discordRoleGranted);
    }
    if (data.notionAccessGranted !== undefined) {
      updates.push('notion_access_granted = ?');
      values.push(data.notionAccessGranted);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(subscriptionId);

    await connection.execute(`
      UPDATE subscriptions 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    return NextResponse.json({ message: 'Подписка обновлена' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Не удалось обновить подписку' }, { status: 500 });
  } finally {
    connection.release();
  }
}
