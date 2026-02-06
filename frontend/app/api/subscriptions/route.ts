import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { addMonths } from '@/lib/utils';
import crypto from 'crypto';

// Проверка и создание таблиц
async function ensureTables(connection: any): Promise<void> {
  try {
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users', 'subscriptions')
    `);

    const existingTables = (tables as any[]).map(t => t.TABLE_NAME);

    if (!existingTables.includes('users')) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          telegram_id BIGINT UNIQUE,
          telegram_username VARCHAR(100),
          telegram_first_name VARCHAR(100),
          telegram_last_name VARCHAR(100),
          discord_id VARCHAR(50),
          discord_username VARCHAR(100),
          email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    if (!existingTables.includes('subscriptions')) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          pricing_id VARCHAR(36),
          period_months INT NOT NULL DEFAULT 1,
          amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          currency VARCHAR(10) DEFAULT 'RUB',
          status ENUM('pending', 'active', 'expired', 'cancelled') DEFAULT 'pending',
          start_date TIMESTAMP NULL,
          end_date TIMESTAMP NULL,
          discord_role_granted BOOLEAN DEFAULT FALSE,
          notion_access_granted BOOLEAN DEFAULT FALSE,
          auto_renew BOOLEAN DEFAULT FALSE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
  } catch (error) {
    console.error('Error ensuring tables:', error);
  }
}

// GET /api/subscriptions - список подписок (админ)
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const connection = await getConnection();
  try {
    await ensureTables(connection);

    let whereClause = '1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    if (userId) {
      whereClause += ' AND s.user_id = ?';
      params.push(userId);
    }

    // Добавляем tariff_id если нет
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'subscriptions' 
        AND COLUMN_NAME = 'tariff_id'
      `);
      if ((columns as any[]).length === 0) {
        await connection.execute(`
          ALTER TABLE subscriptions ADD COLUMN tariff_id VARCHAR(36) AFTER pricing_id
        `);
      }
    } catch (e) {
      // Игнорируем
    }

    // Добавляем is_free (бесплатная подписка — не входит в прибыль)
    try {
      const [colFree] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'is_free'
      `);
      if ((colFree as any[]).length === 0) {
        await connection.execute(`
          ALTER TABLE subscriptions ADD COLUMN is_free TINYINT(1) DEFAULT 0 COMMENT 'Бесплатная подписка, не входит в прибыль'
        `);
      }
    } catch (e) {
      // Игнорируем
    }

    // Одинаковая collation в JOIN — избегаем ER_CANT_AGGREGATE_2COLLATIONS; LIMIT/OFFSET — числа, не плейсхолдеры
    const limitNum = Math.max(1, Math.min(100, limit));
    const offsetNum = Math.max(0, offset);
    const [rows] = await connection.execute(
      `
      SELECT 
        s.*,
        u.telegram_id,
        u.telegram_username,
        u.telegram_first_name,
        u.discord_id,
        u.discord_username,
        u.email,
        t.id as tariff_id_ref,
        t.name as tariff_name,
        tp.monthly_price as tariff_monthly_price,
        tp.period_months as tariff_period_months
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN tariffs t ON s.tariff_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN tariff_prices tp ON s.tariff_price_id COLLATE utf8mb4_unicode_ci = tp.id COLLATE utf8mb4_unicode_ci
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `,
      params
    );

    // Получаем общее количество
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM subscriptions s WHERE ${whereClause}
    `, params);

    const total = (countResult as any[])[0].total;

    const subscriptions = (rows as any[]).map(row => ({
      id: row.id,
      userId: row.user_id,
      pricingId: row.pricing_id,
      tariffId: row.tariff_id,
      periodMonths: row.period_months,
      amount: parseFloat(row.amount),
      currency: 'USDT', // Всегда USDT
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
        telegramId: row.telegram_id,
        telegramUsername: row.telegram_username,
        telegramFirstName: row.telegram_first_name,
        discordId: row.discord_id,
        discordUsername: row.discord_username,
        email: row.email
      },
      tariff: row.tariff_id_ref ? {
        id: row.tariff_id_ref,
        name: row.tariff_name,
        price: row.tariff_monthly_price != null ? parseFloat(row.tariff_monthly_price) : parseFloat(row.amount),
        durationDays: (row.tariff_period_months ?? row.period_months) ? (row.tariff_period_months ?? row.period_months) * 30 : null
      } : undefined
    }));

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/subscriptions - создать подписку (админ)
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const data = await request.json();
  
  // Можно создать по tariffId или по periodMonths + amount
  if (!data.userId) {
    return NextResponse.json({ 
      error: 'userId is required' 
    }, { status: 400 });
  }

  if (!data.tariffId && (!data.periodMonths || data.amount === undefined)) {
    return NextResponse.json({ 
      error: 'tariffId or (periodMonths and amount) are required' 
    }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    const id = crypto.randomUUID();
    const now = new Date();
    let endDate = new Date(now);
    let periodMonths = data.periodMonths || 1;
    let amount = data.amount || 0;
    let tariffId = data.tariffId || null;

    // Если указан tariffId, получаем данные тарифа
    if (tariffId) {
      const [tariffRows] = await connection.execute(
        'SELECT * FROM tariffs WHERE id = ?',
        [tariffId]
      );
      if (Array.isArray(tariffRows) && tariffRows.length > 0) {
        const tariff = (tariffRows as any[])[0];
        amount = parseFloat(tariff.price);
        periodMonths = Math.ceil(tariff.duration_days / 30); // Примерное количество месяцев
        endDate = new Date(now.getTime() + tariff.duration_days * 24 * 60 * 60 * 1000);
      }
    } else {
      endDate = addMonths(now, Math.max(1, Math.min(120, Math.floor(periodMonths))));
    }

    // Если есть указанная дата окончания, используем её
    if (data.endDate) {
      endDate = new Date(data.endDate);
    }

    // Добавляем tariff_id и is_free колонки если нет
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' 
        AND COLUMN_NAME IN ('tariff_id', 'is_free')
      `);
      const have = (columns as any[]).map((c: any) => c.COLUMN_NAME);
      if (!have.includes('tariff_id')) {
        await connection.execute(`ALTER TABLE subscriptions ADD COLUMN tariff_id VARCHAR(36) AFTER pricing_id`);
      }
      if (!have.includes('is_free')) {
        await connection.execute(`ALTER TABLE subscriptions ADD COLUMN is_free TINYINT(1) DEFAULT 0`);
      }
    } catch (e) {
      // Игнорируем
    }

    const isFree = Boolean(data.isFree);
    await connection.execute(`
      INSERT INTO subscriptions 
        (id, user_id, pricing_id, tariff_id, period_months, amount, currency, status, start_date, end_date, is_free, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.userId,
      data.pricingId || null,
      tariffId,
      periodMonths,
      amount,
      'USDT', // Всегда USDT
      data.status || 'active',
      now,
      endDate,
      isFree ? 1 : 0,
      data.notes || null
    ]);

    // Логируем
    try {
      await connection.execute(
        `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
         VALUES (?, ?, ?, 'subscription_created', ?)`,
        [crypto.randomUUID(), data.userId, id, JSON.stringify({ admin: true, amount, tariffId })]
      );
    } catch (e) {
      // Игнорируем если таблица логов не существует
    }

    return NextResponse.json({ 
      id,
      message: 'Subscription created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  } finally {
    connection.release();
  }
}
