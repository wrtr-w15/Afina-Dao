import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnection } from '@/lib/database';
import { Tariff, TariffPrice, CreateTariffData, TariffStats } from '@/types/tariff';

// Создание таблиц если они не существуют
async function ensureTables(connection: any): Promise<void> {
  try {
    // Проверяем существование таблицы tariffs
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tariffs'
    `);
    
    if ((tables as any[]).length === 0) {
      // Создаём таблицу tariffs
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tariffs (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          features JSON,
          is_active TINYINT(1) DEFAULT 1,
          is_archived TINYINT(1) DEFAULT 0,
          is_custom TINYINT(1) DEFAULT 0,
          custom_for_user_id VARCHAR(36),
          sort_order INT DEFAULT 0,
          color VARCHAR(50) DEFAULT 'indigo',
          badge VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_is_active (is_active),
          INDEX idx_is_archived (is_archived),
          INDEX idx_is_custom (is_custom),
          INDEX idx_sort_order (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Created tariffs table');
    }

    // Проверяем существование таблицы tariff_prices
    const [pricesTables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tariff_prices'
    `);

    if ((pricesTables as any[]).length === 0) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tariff_prices (
          id VARCHAR(36) PRIMARY KEY,
          tariff_id VARCHAR(36) NOT NULL,
          period_months INT NOT NULL,
          monthly_price DECIMAL(12, 2) NOT NULL,
          is_popular TINYINT(1) DEFAULT 0,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_tariff_period (tariff_id, period_months),
          INDEX idx_tariff_id (tariff_id),
          INDEX idx_sort_order (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Created tariff_prices table');
    }

    // Проверяем существование таблицы tariff_history
    const [historyTables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'tariff_history'
    `);

    if ((historyTables as any[]).length === 0) {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tariff_history (
          id VARCHAR(36) PRIMARY KEY,
          tariff_id VARCHAR(36) NOT NULL,
          changed_by VARCHAR(36),
          change_type ENUM('created', 'updated', 'archived', 'activated', 'deactivated') NOT NULL,
          old_values JSON,
          new_values JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_tariff_id (tariff_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Created tariff_history table');
    }

    // Удаляем старые колонки price и duration_days из tariffs если они есть
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tariffs' 
        AND COLUMN_NAME IN ('price', 'duration_days')
      `);
      
      for (const col of columns as any[]) {
        try {
          await connection.execute(`ALTER TABLE tariffs DROP COLUMN ${col.COLUMN_NAME}`);
          console.log(`Dropped column ${col.COLUMN_NAME} from tariffs`);
        } catch (e) {
          // Игнорируем
        }
      }
    } catch (e) {
      // Игнорируем
    }

    // Добавляем tariff_id и tariff_price_id в subscriptions если нет
    try {
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'subscriptions' 
        AND COLUMN_NAME IN ('tariff_id', 'tariff_price_id')
      `);
      
      const columnNames = (columns as any[]).map(c => c.COLUMN_NAME);
      
      if (!columnNames.includes('tariff_id')) {
        await connection.execute(`
          ALTER TABLE subscriptions ADD COLUMN tariff_id VARCHAR(36) AFTER pricing_id
        `);
      }
      if (!columnNames.includes('tariff_price_id')) {
        await connection.execute(`
          ALTER TABLE subscriptions ADD COLUMN tariff_price_id VARCHAR(36) AFTER tariff_id
        `);
      }
    } catch (e) {
      // Игнорируем
    }
  } catch (error) {
    console.error('Error ensuring tables:', error);
  }
}

// Конвертация строки из БД в объект Tariff
function rowToTariff(row: any, prices?: TariffPrice[]): Tariff {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    features: row.features ? (typeof row.features === 'string' ? JSON.parse(row.features) : row.features) : undefined,
    isActive: Boolean(row.is_active),
    isArchived: Boolean(row.is_archived),
    isCustom: Boolean(row.is_custom),
    customForUserId: row.custom_for_user_id || undefined,
    sortOrder: row.sort_order || 0,
    color: row.color || 'indigo',
    badge: row.badge || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    prices: prices || []
  };
}

function rowToTariffPrice(row: any): TariffPrice {
  return {
    id: row.id,
    tariffId: row.tariff_id,
    periodMonths: row.period_months,
    monthlyPrice: parseFloat(row.monthly_price),
    isPopular: Boolean(row.is_popular),
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/tariffs - получить список тарифов
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';
  const includeCustom = searchParams.get('includeCustom') === 'true';
  const activeOnly = searchParams.get('activeOnly') === 'true';
  const forUserId = searchParams.get('forUserId');
  const withStats = searchParams.get('withStats') === 'true';

  const connection = await getConnection();
  try {
    await ensureTables(connection);

    // Строим запрос
    let whereConditions: string[] = [];
    let params: any[] = [];

    if (!includeArchived) {
      whereConditions.push('is_archived = 0');
    }

    if (!includeCustom) {
      whereConditions.push('is_custom = 0');
    }

    if (activeOnly) {
      whereConditions.push('is_active = 1');
    }

    if (forUserId) {
      whereConditions = whereConditions.filter(c => c !== 'is_custom = 0');
      whereConditions.push('(is_custom = 0 OR custom_for_user_id = ?)');
      params.push(forUserId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [rows] = await connection.execute(`
      SELECT * FROM tariffs 
      ${whereClause}
      ORDER BY sort_order ASC, created_at DESC
    `, params);

    // Получаем цены для всех тарифов
    const tariffIds = (rows as any[]).map(r => r.id);
    let pricesMap: Map<string, TariffPrice[]> = new Map();
    
    if (tariffIds.length > 0) {
      const [priceRows] = await connection.execute(`
        SELECT * FROM tariff_prices 
        WHERE tariff_id IN (${tariffIds.map(() => '?').join(',')})
        ORDER BY sort_order ASC, period_months ASC
      `, tariffIds);

      for (const priceRow of priceRows as any[]) {
        const tariffId = priceRow.tariff_id;
        if (!pricesMap.has(tariffId)) {
          pricesMap.set(tariffId, []);
        }
        pricesMap.get(tariffId)!.push(rowToTariffPrice(priceRow));
      }
    }

    const tariffs: Tariff[] = (rows as any[]).map(row => 
      rowToTariff(row, pricesMap.get(row.id) || [])
    );

    // Получаем статистику если нужно
    let stats: TariffStats | undefined;
    if (withStats) {
      const [statsRows] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 AND is_archived = 0 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived,
          SUM(CASE WHEN is_custom = 1 THEN 1 ELSE 0 END) as custom
        FROM tariffs
      `);

      let subscriptionStats = { totalSubscriptions: 0, activeSubscriptions: 0, totalRevenue: 0 };
      try {
        const [subStats] = await connection.execute(`
          SELECT 
            COUNT(*) as total_subscriptions,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
            COALESCE(SUM(CASE WHEN status IN ('active', 'expired') THEN amount ELSE 0 END), 0) as total_revenue
          FROM subscriptions
          WHERE tariff_id IS NOT NULL
        `);
        if (Array.isArray(subStats) && subStats.length > 0) {
          subscriptionStats = {
            totalSubscriptions: (subStats[0] as any).total_subscriptions || 0,
            activeSubscriptions: (subStats[0] as any).active_subscriptions || 0,
            totalRevenue: parseFloat((subStats[0] as any).total_revenue) || 0
          };
        }
      } catch (e) {
        // Таблица subscriptions может не существовать
      }

      const row = (statsRows as any[])[0];
      stats = {
        total: row.total || 0,
        active: row.active || 0,
        archived: row.archived || 0,
        custom: row.custom || 0,
        ...subscriptionStats
      };
    }

    return NextResponse.json({
      tariffs,
      ...(stats && { stats })
    });
  } catch (error) {
    console.error('Error fetching tariffs:', error);
    return NextResponse.json({ error: 'Failed to fetch tariffs' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/tariffs - создать новый тариф
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const data: CreateTariffData = await request.json();

  // Валидация
  if (!data.name || data.name.trim() === '') {
    return NextResponse.json({ error: 'Название тарифа обязательно' }, { status: 400 });
  }
  if (!data.prices || data.prices.length === 0) {
    return NextResponse.json({ error: 'Укажите хотя бы одну ценовую опцию' }, { status: 400 });
  }

  // Валидация цен
  for (const price of data.prices) {
    if (!price.periodMonths || price.periodMonths < 1) {
      return NextResponse.json({ error: 'Количество месяцев должно быть минимум 1' }, { status: 400 });
    }
    if (price.monthlyPrice === undefined || price.monthlyPrice < 0) {
      return NextResponse.json({ error: 'Цена должна быть неотрицательной' }, { status: 400 });
    }
  }

  const connection = await getConnection();
  try {
    await ensureTables(connection);

    const tariffId = crypto.randomUUID();
    
    // Создаём тариф
    await connection.execute(`
      INSERT INTO tariffs (id, name, description, features, is_active, is_custom, custom_for_user_id, sort_order, color, badge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tariffId,
      data.name.trim(),
      data.description || null,
      data.features ? JSON.stringify(data.features) : null,
      data.isActive !== false ? 1 : 0,
      data.isCustom ? 1 : 0,
      data.customForUserId || null,
      data.sortOrder || 0,
      data.color || 'indigo',
      data.badge || null
    ]);

    // Создаём ценовые опции
    for (let i = 0; i < data.prices.length; i++) {
      const price = data.prices[i];
      const priceId = crypto.randomUUID();
      
      await connection.execute(`
        INSERT INTO tariff_prices (id, tariff_id, period_months, monthly_price, is_popular, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        priceId,
        tariffId,
        price.periodMonths,
        price.monthlyPrice,
        price.isPopular ? 1 : 0,
        price.sortOrder ?? i
      ]);
    }

    // Записываем в историю
    const historyId = crypto.randomUUID();
    await connection.execute(`
      INSERT INTO tariff_history (id, tariff_id, change_type, new_values)
      VALUES (?, ?, 'created', ?)
    `, [historyId, tariffId, JSON.stringify(data)]);

    // Возвращаем созданный тариф с ценами
    const [rows] = await connection.execute('SELECT * FROM tariffs WHERE id = ?', [tariffId]);
    const [priceRows] = await connection.execute(
      'SELECT * FROM tariff_prices WHERE tariff_id = ? ORDER BY sort_order ASC, period_months ASC', 
      [tariffId]
    );
    
    const prices = (priceRows as any[]).map(rowToTariffPrice);
    const tariff = rowToTariff((rows as any[])[0], prices);

    return NextResponse.json(tariff, { status: 201 });
  } catch (error) {
    console.error('Error creating tariff:', error);
    return NextResponse.json({ error: 'Failed to create tariff' }, { status: 500 });
  } finally {
    connection.release();
  }
}
