import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { grantRole } from '@/lib/discord-bot';
import { grantAccess } from '@/lib/notion';
import { grantAccess as grantGoogleDriveAccess } from '@/lib/google-drive';
import crypto from 'crypto';

// POST /api/users/[id]/refresh-accesses - обновить доступы для пользователя
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const connection = await getConnection();

  try {
    // Получаем пользователя и его активную подписку
    const [users] = await connection.execute(
      `SELECT u.*, s.id as subscription_id, s.status as subscription_status, s.end_date
       FROM users u
       LEFT JOIN subscriptions s ON u.id COLLATE utf8mb4_unicode_ci = s.user_id COLLATE utf8mb4_unicode_ci
         AND s.status = 'active' AND s.end_date > NOW()
       WHERE u.id = ?
       ORDER BY s.end_date DESC
       LIMIT 1`,
      [id]
    );

    if ((users as any[]).length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = (users as any[])[0];
    const subscriptionId = userData.subscription_id;
    const hasActiveSubscription = subscriptionId && userData.subscription_status === 'active';

    if (!hasActiveSubscription) {
      return NextResponse.json({
        success: false,
        error: 'User does not have an active subscription',
        message: 'Пользователь не имеет активной подписки'
      }, { status: 400 });
    }

    const results: {
      discord?: { success: boolean; error?: string };
      notion?: { success: boolean; error?: string };
      googleDrive?: { success: boolean; error?: string };
    } = {};

    // Выдаем Discord роль
    if (userData.discord_id) {
      try {
        const result = await grantRole(userData.discord_id);
        results.discord = result;
        if (result.success) {
          await connection.execute(
            `UPDATE subscriptions SET discord_role_granted = TRUE WHERE id = ?`,
            [subscriptionId]
          );
        }
      } catch (e: any) {
        results.discord.error = e.message || 'Unknown error';
        console.error('Failed to grant Discord role:', e);
      }
    }

    // Выдаем Notion доступ
    if (userData.email) {
      try {
        const result = await grantAccess(userData.email, userData.id, subscriptionId);
        results.notion = result;
        if (result.success) {
          await connection.execute(
            `UPDATE subscriptions SET notion_access_granted = TRUE WHERE id = ?`,
            [subscriptionId]
          );
        }
      } catch (e: any) {
        results.notion.error = e.message || 'Unknown error';
        console.error('Failed to grant Notion access:', e);
      }
    }

    // Выдаем Google Drive доступ
    if (userData.google_drive_email) {
      try {
        const result = await grantGoogleDriveAccess(
          userData.google_drive_email,
          userData.id,
          subscriptionId
        );
        results.googleDrive = result;
        if (result.success) {
          try {
            await connection.execute(
              `UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?`,
              [subscriptionId]
            );
          } catch (e: any) {
            // Если поле не существует, добавляем его
            if (e.code === 'ER_BAD_FIELD_ERROR') {
              await connection.execute(
                'ALTER TABLE subscriptions ADD COLUMN google_drive_access_granted BOOLEAN DEFAULT FALSE'
              );
              await connection.execute(
                'UPDATE subscriptions SET google_drive_access_granted = TRUE WHERE id = ?',
                [subscriptionId]
              );
            }
          }
        }
      } catch (e: any) {
        results.googleDrive.error = e.message || 'Unknown error';
        console.error('Failed to grant Google Drive access:', e);
      }
    }

    // Логируем действие
    await connection.execute(
      `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
       VALUES (?, ?, ?, 'accesses_refreshed', ?)`,
      [
        crypto.randomUUID(),
        userData.id,
        subscriptionId,
        JSON.stringify(results)
      ]
    );

    // Проверяем успех только для тех доступов, которые были попытка выдать
    const attemptedAccesses = Object.keys(results);
    const allSuccess = attemptedAccesses.length > 0 && 
                      attemptedAccesses.every(key => results[key as keyof typeof results]?.success !== false);

    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess 
        ? 'Доступы успешно обновлены'
        : 'Доступы обновлены с ошибками (проверьте детали)'
    });
  } catch (error: any) {
    console.error('Error refreshing accesses:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to refresh accesses'
    }, { status: 500 });
  } finally {
    connection.release();
  }
}
