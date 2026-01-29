import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { grantRole, revokeRole } from '@/lib/discord-bot';
import { grantAccess, revokeAccess } from '@/lib/notion';
import crypto from 'crypto';

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
      LEFT JOIN users u ON s.user_id = u.id
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
    // Проверяем существование подписки
    const [existing] = await connection.execute(`
      SELECT s.*, u.discord_id, u.email 
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [id]);

    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const subscription = (existing as any[])[0];
    const oldStatus = subscription.status;
    const newStatus = data.status || oldStatus;

    // Обновляем подписку
    await connection.execute(`
      UPDATE subscriptions SET
        status = COALESCE(?, status),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        discord_role_granted = COALESCE(?, discord_role_granted),
        notion_access_granted = COALESCE(?, notion_access_granted),
        auto_renew = COALESCE(?, auto_renew),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.status,
      data.startDate,
      data.endDate,
      data.discordRoleGranted,
      data.notionAccessGranted,
      data.autoRenew,
      data.notes,
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
