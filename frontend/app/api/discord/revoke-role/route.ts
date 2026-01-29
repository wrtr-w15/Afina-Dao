import { NextRequest, NextResponse } from 'next/server';
import { revokeRole } from '@/lib/discord-bot';
import { getConnection } from '@/lib/database';
import crypto from 'crypto';

// POST /api/discord/revoke-role - забрать роль у пользователя
export async function POST(request: NextRequest) {
  // Проверка аутентификации
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  try {
    const { discordId, subscriptionId } = await request.json();

    if (!discordId) {
      return NextResponse.json({ error: 'discordId is required' }, { status: 400 });
    }

    // Забираем роль
    const result = await revokeRole(discordId);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to revoke role',
        details: result.error 
      }, { status: 500 });
    }

    // Обновляем статус в подписке
    if (subscriptionId) {
      const connection = await getConnection();
      try {
        await connection.execute(
          `UPDATE subscriptions 
           SET discord_role_granted = FALSE, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [subscriptionId]
        );

        // Логируем
        await connection.execute(
          `INSERT INTO subscription_logs (id, subscription_id, action, details)
           VALUES (?, ?, 'discord_role_revoked', ?)`,
          [crypto.randomUUID(), subscriptionId, JSON.stringify({ discordId })]
        );
      } finally {
        connection.release();
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Role revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking role:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
