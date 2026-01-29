import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

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
    // Проверяем существует ли подписка и принадлежит ли она пользователю
    const [subscriptions] = await connection.execute(
      'SELECT id, status FROM subscriptions WHERE id = ? AND user_id = ?',
      [subscriptionId, userId]
    );

    if ((subscriptions as any[]).length === 0) {
      return NextResponse.json({ error: 'Подписка не найдена' }, { status: 404 });
    }

    // Отменяем подписку (меняем статус вместо удаления)
    await connection.execute(`
      UPDATE subscriptions 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [subscriptionId]);

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
