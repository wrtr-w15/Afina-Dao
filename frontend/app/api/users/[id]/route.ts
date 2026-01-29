import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

// GET /api/users/[id] - детали пользователя
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
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if ((users as any[]).length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = (users as any[])[0];

    // Получаем подписки пользователя
    let subscriptions: any[] = [];
    try {
      const [rows] = await connection.execute(`
        SELECT * FROM subscriptions 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [id]);
      subscriptions = rows as any[];
    } catch (e) {
      // Таблица может не существовать
    }

    // Получаем платежи пользователя
    let payments: any[] = [];
    try {
      const [rows] = await connection.execute(`
        SELECT * FROM payments 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [id]);
      payments = rows as any[];
    } catch (e) {
      // Таблица может не существовать
    }

    // Получаем логи
    let logs: any[] = [];
    try {
      const [rows] = await connection.execute(`
        SELECT * FROM subscription_logs 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `, [id]);
      logs = rows as any[];
    } catch (e) {
      // Таблица может не существовать
    }

    return NextResponse.json({
      id: user.id,
      telegramId: user.telegram_id,
      telegramUsername: user.telegram_username,
      telegramFirstName: user.telegram_first_name,
      telegramLastName: user.telegram_last_name,
      discordId: user.discord_id,
      discordUsername: user.discord_username,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        tariffId: s.tariff_id,
        tariffPriceId: s.tariff_price_id,
        periodMonths: s.period_months,
        amount: parseFloat(s.amount || '0'),
        currency: s.currency,
        status: s.status,
        startDate: s.start_date,
        endDate: s.end_date,
        discordRoleGranted: Boolean(s.discord_role_granted),
        notionAccessGranted: Boolean(s.notion_access_granted),
        createdAt: s.created_at
      })),
      payments: payments.map(p => ({
        id: p.id,
        subscriptionId: p.subscription_id,
        amount: parseFloat(p.amount || '0'),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.payment_method,
        paidAt: p.paid_at,
        createdAt: p.created_at
      })),
      logs: logs.map(l => ({
        id: l.id,
        action: l.action,
        details: l.details ? (typeof l.details === 'string' ? JSON.parse(l.details) : l.details) : null,
        createdAt: l.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/users/[id] - обновить пользователя
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
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Строим динамический UPDATE запрос
    const updates: string[] = [];
    const values: any[] = [];

    if (data.telegramId !== undefined) {
      updates.push('telegram_id = ?');
      values.push(data.telegramId || null);
    }
    if (data.telegramUsername !== undefined) {
      updates.push('telegram_username = ?');
      values.push(data.telegramUsername || null);
    }
    if (data.telegramFirstName !== undefined) {
      updates.push('telegram_first_name = ?');
      values.push(data.telegramFirstName || null);
    }
    if (data.discordId !== undefined) {
      updates.push('discord_id = ?');
      values.push(data.discordId || null);
    }
    if (data.discordUsername !== undefined) {
      updates.push('discord_username = ?');
      values.push(data.discordUsername || null);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await connection.execute(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `, values);

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  } finally {
    connection.release();
  }
}
