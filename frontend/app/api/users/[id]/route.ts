import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import crypto from 'crypto';

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

    // Тарифы, которые пользователь видит в боте (если пусто — показывается тариф по умолчанию)
    let availableTariffIds: string[] = [];
    let availableTariffs: { tariffId: string; tariffName: string }[] = [];
    try {
      const [tariffRows] = await connection.execute(
        `SELECT uat.tariff_id, t.name as tariff_name 
         FROM user_available_tariffs uat 
         LEFT JOIN tariffs t ON t.id COLLATE utf8mb4_unicode_ci = uat.tariff_id COLLATE utf8mb4_unicode_ci 
         WHERE uat.user_id = ?`,
        [id]
      );
      const arr = tariffRows as any[];
      availableTariffIds = arr.map((r: any) => r.tariff_id);
      availableTariffs = arr.map((r: any) => ({ tariffId: r.tariff_id, tariffName: r.tariff_name || r.tariff_id }));
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
      availableTariffIds,
      availableTariffs,
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
        isFree: Boolean(s.is_free),
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

    // Уникальность: почта / Discord / Telegram — только у одного аккаунта (другой пользователь не должен уже иметь это значение)
    if (data.telegramId !== undefined && data.telegramId != null && String(data.telegramId).trim() !== '') {
      const [dup] = await connection.execute(
        'SELECT id FROM users WHERE telegram_id = ? AND id != ?',
        [data.telegramId, id]
      );
      if ((dup as any[]).length > 0) {
        return NextResponse.json({ error: 'Пользователь с таким Telegram ID уже существует' }, { status: 400 });
      }
    }
    if (data.telegramUsername !== undefined) {
      const un = data.telegramUsername != null ? String(data.telegramUsername).trim().replace(/^@/, '') : '';
      if (un) {
        const [dup] = await connection.execute(
          'SELECT id FROM users WHERE LOWER(TRIM(REPLACE(COALESCE(telegram_username,\'\'), \'@\', \'\'))) = LOWER(?) AND COALESCE(telegram_username,\'\') != \'\' AND id != ?',
          [un, id]
        );
        if ((dup as any[]).length > 0) {
          return NextResponse.json({ error: 'Пользователь с таким Telegram username уже существует' }, { status: 400 });
        }
      }
    }
    if (data.discordId !== undefined && data.discordId != null && String(data.discordId).trim() !== '') {
      const [dup] = await connection.execute(
        'SELECT id FROM users WHERE discord_id = ? AND id != ?',
        [data.discordId.trim(), id]
      );
      if ((dup as any[]).length > 0) {
        return NextResponse.json({ error: 'Пользователь с таким Discord ID уже существует' }, { status: 400 });
      }
    }
    if (data.email !== undefined && data.email != null && String(data.email).trim() !== '') {
      const [dup] = await connection.execute(
        'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND email IS NOT NULL AND email != \'\' AND id != ?',
        [data.email.trim(), id]
      );
      if ((dup as any[]).length > 0) {
        return NextResponse.json({ error: 'Пользователь с такой почтой уже существует' }, { status: 400 });
      }
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
    if (data.telegramLastName !== undefined) {
      updates.push('telegram_last_name = ?');
      values.push(data.telegramLastName || null);
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

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      await connection.execute(`
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `, values);
    }

    // Тарифы для бота: какие тарифы видит пользователь при оплате в Telegram
    if (data.availableTariffIds !== undefined) {
      const tariffIds = Array.isArray(data.availableTariffIds) ? data.availableTariffIds : [];
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS user_available_tariffs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            tariff_id VARCHAR(36) NOT NULL,
            granted_by VARCHAR(36),
            valid_until TIMESTAMP NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_tariff (user_id, tariff_id),
            INDEX idx_user_id (user_id),
            INDEX idx_tariff_id (tariff_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await connection.execute('DELETE FROM user_available_tariffs WHERE user_id = ?', [id]);
        for (const tariffId of tariffIds) {
          if (!tariffId) continue;
          await connection.execute(
            `INSERT INTO user_available_tariffs (id, user_id, tariff_id) VALUES (?, ?, ?)`,
            [crypto.randomUUID(), id, tariffId]
          );
        }
      } catch (e) {
        console.error('Error updating user_available_tariffs:', e);
        return NextResponse.json({ error: 'Failed to update available tariffs' }, { status: 500 });
      }
    }

    if (updates.length === 0 && data.availableTariffIds === undefined) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/users/[id] — удалить пользователя (и связанные записи)
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
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Удаляем в порядке зависимостей: платежи → подписки → тарифы пользователя → логи → пользователь
    try {
      await connection.execute('DELETE FROM payments WHERE user_id = ?', [id]);
    } catch (e) {
      // Таблица может не существовать
    }
    try {
      await connection.execute('DELETE FROM subscriptions WHERE user_id = ?', [id]);
    } catch (e) {}
    try {
      await connection.execute('DELETE FROM user_available_tariffs WHERE user_id = ?', [id]);
    } catch (e) {}
    try {
      await connection.execute('DELETE FROM subscription_logs WHERE user_id = ?', [id]);
    } catch (e) {}

    await connection.execute('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  } finally {
    connection.release();
  }
}
