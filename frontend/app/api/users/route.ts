import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import crypto from 'crypto';

// Безопасное добавление колонки
async function safeAddColumn(connection: any, table: string, column: string, definition: string): Promise<void> {
  try {
    await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Added column ${column} to ${table}`);
  } catch (e: any) {
    // Игнорируем ошибку если колонка уже существует (1060 = Duplicate column name)
    if (e.errno !== 1060) {
      console.error(`Error adding column ${column}:`, e.message);
    }
  }
}

// Миграция колонки id с INT на VARCHAR(36) с обработкой foreign keys
async function migrateIdColumnToVarchar(connection: any): Promise<boolean> {
  try {
    // Проверяем текущий тип колонки id
    const [idColumn] = await connection.execute(`
      SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'id'
    `);
    
    if (!idColumn || (idColumn as any[]).length === 0) {
      return false;
    }
    
    const col = (idColumn as any[])[0];
    
    // Если уже VARCHAR(36) или больше - ничего не делаем
    if (col.DATA_TYPE === 'varchar' && col.CHARACTER_MAXIMUM_LENGTH >= 36) {
      return true;
    }
    
    console.log('Migrating users.id column from INT to VARCHAR(36)...');
    
    // Находим все foreign keys которые ссылаются на users.id
    const [foreignKeys] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME, 
        TABLE_NAME, 
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND REFERENCED_TABLE_NAME = 'users' 
      AND REFERENCED_COLUMN_NAME = 'id'
    `);
    
    // Сохраняем информацию о FK для пересоздания
    const fkList = (foreignKeys as any[]).map(fk => ({
      constraintName: fk.CONSTRAINT_NAME,
      tableName: fk.TABLE_NAME,
      columnName: fk.COLUMN_NAME
    }));
    
    // Удаляем все foreign keys
    for (const fk of fkList) {
      try {
        console.log(`Dropping FK ${fk.constraintName} from ${fk.tableName}...`);
        await connection.execute(`ALTER TABLE ${fk.tableName} DROP FOREIGN KEY ${fk.constraintName}`);
      } catch (e: any) {
        console.log(`FK ${fk.constraintName} might not exist:`, e.message);
      }
    }
    
    // Изменяем связанные колонки на VARCHAR(36)
    for (const fk of fkList) {
      try {
        console.log(`Modifying ${fk.tableName}.${fk.columnName} to VARCHAR(36)...`);
        await connection.execute(`ALTER TABLE ${fk.tableName} MODIFY COLUMN ${fk.columnName} VARCHAR(36)`);
      } catch (e: any) {
        console.error(`Error modifying ${fk.tableName}.${fk.columnName}:`, e.message);
      }
    }
    
    // Конвертируем существующие INT id в VARCHAR
    // Сначала добавляем временную колонку
    try {
      await connection.execute(`ALTER TABLE users ADD COLUMN id_new VARCHAR(36)`);
      
      // Копируем данные (конвертируем INT в строку, добавляя UUID-подобный формат)
      await connection.execute(`
        UPDATE users SET id_new = CONCAT(
          LPAD(HEX(id), 8, '0'), '-',
          LPAD(HEX(FLOOR(RAND() * 65536)), 4, '0'), '-',
          '4', LPAD(HEX(FLOOR(RAND() * 4096)), 3, '0'), '-',
          LPAD(HEX(FLOOR(RAND() * 65536)), 4, '0'), '-',
          LPAD(HEX(FLOOR(RAND() * 281474976710656)), 12, '0')
        )
      `);
      
      // Обновляем связанные таблицы
      for (const fk of fkList) {
        await connection.execute(`
          UPDATE ${fk.tableName} t
          JOIN users u ON t.${fk.columnName} = u.id
          SET t.${fk.columnName} = u.id_new
        `);
      }
      
      // Удаляем старую колонку id и переименовываем новую
      await connection.execute(`ALTER TABLE users DROP COLUMN id`);
      await connection.execute(`ALTER TABLE users CHANGE COLUMN id_new id VARCHAR(36) NOT NULL PRIMARY KEY`);
      
      console.log('Successfully migrated users.id to VARCHAR(36)');
    } catch (e: any) {
      // Если что-то пошло не так, пробуем простой подход (если нет данных)
      console.log('Complex migration failed, trying simple approach:', e.message);
      try {
        await connection.execute(`ALTER TABLE users DROP COLUMN id_new`);
      } catch {}
      
      // Проверяем есть ли данные в таблице
      const [countResult] = await connection.execute('SELECT COUNT(*) as cnt FROM users');
      const count = (countResult as any[])[0].cnt;
      
      if (count === 0) {
        // Таблица пустая - можно просто изменить тип
        await connection.execute(`ALTER TABLE users MODIFY COLUMN id VARCHAR(36) NOT NULL`);
        console.log('Modified empty users table id column to VARCHAR(36)');
      } else {
        console.error('Cannot migrate users.id - table has data and migration failed');
        return false;
      }
    }
    
    // Пересоздаём foreign keys (опционально, можно пропустить если не критично)
    // for (const fk of fkList) {
    //   try {
    //     await connection.execute(`
    //       ALTER TABLE ${fk.tableName} 
    //       ADD CONSTRAINT ${fk.constraintName} 
    //       FOREIGN KEY (${fk.columnName}) REFERENCES users(id)
    //     `);
    //   } catch (e: any) {
    //     console.log(`Could not recreate FK ${fk.constraintName}:`, e.message);
    //   }
    // }
    
    return true;
  } catch (error) {
    console.error('Error in migrateIdColumnToVarchar:', error);
    return false;
  }
}

// Проверка и создание таблиц если не существуют
async function ensureTables(connection: any): Promise<void> {
  try {
    // Проверяем существует ли таблица users
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);

    if ((tables as any[]).length === 0) {
      console.log('Creating users table...');
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
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_telegram_id (telegram_id),
          INDEX idx_discord_id (discord_id),
          INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      // Таблица существует - пробуем миграцию id колонки если нужно
      await migrateIdColumnToVarchar(connection);

      // Проверяем и добавляем недостающие колонки
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      `);
      const existingColumns = (columns as any[]).map(c => c.COLUMN_NAME);

      const requiredColumns = [
        { name: 'telegram_id', def: 'BIGINT UNIQUE' },
        { name: 'telegram_username', def: 'VARCHAR(100)' },
        { name: 'telegram_first_name', def: 'VARCHAR(100)' },
        { name: 'telegram_last_name', def: 'VARCHAR(100)' },
        { name: 'discord_id', def: 'VARCHAR(50)' },
        { name: 'discord_username', def: 'VARCHAR(100)' },
        { name: 'email', def: 'VARCHAR(255)' },
        { name: 'created_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'updated_at', def: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
      ];

      for (const col of requiredColumns) {
        if (!existingColumns.includes(col.name)) {
          await safeAddColumn(connection, 'users', col.name, col.def);
        }
      }

      // Получаем все колонки с их типами и делаем их nullable (кроме id)
      const [colInfo] = await connection.execute(`
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
        AND COLUMN_NAME != 'id'
      `);
      
      for (const col of (colInfo as any[])) {
        if (col.IS_NULLABLE === 'NO' || col.COLUMN_DEFAULT === null) {
          try {
            await connection.execute(`ALTER TABLE users MODIFY COLUMN \`${col.COLUMN_NAME}\` ${col.COLUMN_TYPE} NULL`);
          } catch (e: any) {
            // Игнорируем ошибки
          }
        }
      }
    }

    // Проверяем существует ли таблица subscriptions
    const [subTables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'
    `);

    if ((subTables as any[]).length === 0) {
      console.log('Creating subscriptions table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          pricing_id VARCHAR(36),
          tariff_id VARCHAR(36),
          tariff_price_id VARCHAR(36),
          period_months INT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USDT',
          status ENUM('pending', 'active', 'expired', 'cancelled') DEFAULT 'pending',
          start_date TIMESTAMP NULL,
          end_date TIMESTAMP NULL,
          discord_role_granted BOOLEAN DEFAULT FALSE,
          notion_access_granted BOOLEAN DEFAULT FALSE,
          auto_renew BOOLEAN DEFAULT FALSE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_status (status),
          INDEX idx_end_date (end_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } else {
      // Проверяем и добавляем недостающие колонки в subscriptions
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'
      `);
      const existingColumns = (columns as any[]).map(c => c.COLUMN_NAME);

      if (!existingColumns.includes('tariff_id')) {
        await safeAddColumn(connection, 'subscriptions', 'tariff_id', 'VARCHAR(36) AFTER pricing_id');
      }
      if (!existingColumns.includes('tariff_price_id')) {
        await safeAddColumn(connection, 'subscriptions', 'tariff_price_id', 'VARCHAR(36) AFTER tariff_id');
      }
    }
  } catch (error) {
    console.error('Error ensuring tables:', error);
  }
}

// GET /api/users - список пользователей (админ)
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const hasSubscription = searchParams.get('hasSubscription');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const connection = await getConnection();
  try {
    // Убеждаемся что таблицы существуют
    await ensureTables(connection);

    let whereClause = '1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (
        u.telegram_username LIKE ? OR 
        u.telegram_first_name LIKE ? OR 
        u.discord_username LIKE ? OR 
        u.email LIKE ? OR
        u.telegram_id = ? OR
        u.discord_id = ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, search, search);
    }

    // Получаем пользователей с подсчётом подписок
    // Используем query вместо execute для динамических запросов с LIMIT/OFFSET
    // Добавляем COLLATE utf8mb4_unicode_ci для совместимости collation
    const [rows] = await connection.query(`
      SELECT 
        u.*,
        COUNT(DISTINCT s.id) as total_subscriptions,
        SUM(CASE WHEN s.status = 'active' AND s.end_date > NOW() THEN 1 ELSE 0 END) as active_subscriptions,
        MAX(CASE WHEN s.status = 'active' AND s.end_date > NOW() THEN s.end_date ELSE NULL END) as subscription_end_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id COLLATE utf8mb4_unicode_ci = s.user_id COLLATE utf8mb4_unicode_ci
      WHERE ${whereClause}
      GROUP BY u.id
      ${hasSubscription === 'true' ? 'HAVING active_subscriptions > 0' : ''}
      ${hasSubscription === 'false' ? 'HAVING active_subscriptions = 0' : ''}
      ORDER BY u.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `, params);

    // Получаем общее количество
    const [countResult] = await connection.query(`
      SELECT COUNT(DISTINCT u.id) as total 
      FROM users u
      LEFT JOIN subscriptions s ON u.id COLLATE utf8mb4_unicode_ci = s.user_id COLLATE utf8mb4_unicode_ci
      WHERE ${whereClause}
      ${hasSubscription === 'true' ? 'GROUP BY u.id HAVING SUM(CASE WHEN s.status = \'active\' AND s.end_date > NOW() THEN 1 ELSE 0 END) > 0' : ''}
      ${hasSubscription === 'false' ? 'GROUP BY u.id HAVING SUM(CASE WHEN s.status = \'active\' AND s.end_date > NOW() THEN 1 ELSE 0 END) = 0' : ''}
    `, params);

    const total = hasSubscription 
      ? (countResult as any[]).length 
      : (countResult as any[])[0]?.total || 0;

    const users = (rows as any[]).map(row => ({
      id: row.id,
      telegramId: row.telegram_id,
      telegramUsername: row.telegram_username,
      telegramFirstName: row.telegram_first_name,
      telegramLastName: row.telegram_last_name,
      discordId: row.discord_id,
      discordUsername: row.discord_username,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalSubscriptions: row.total_subscriptions,
      activeSubscriptions: row.active_subscriptions,
      subscriptionEndDate: row.subscription_end_date
    }));

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/users - создать пользователя вручную (админ)
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const data = await request.json();

  // Валидация - нужен хотя бы один идентификатор
  const hasId = data.telegramId || data.discordId || (data.email && String(data.email).trim()) || (data.telegramUsername && String(data.telegramUsername).trim());
  if (!hasId) {
    return NextResponse.json({
      error: 'Нужен хотя бы один идентификатор: Telegram ID, Telegram username, Discord ID или Email'
    }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    await ensureTables(connection);

    // Уникальность: с одной почтой / Discord / Telegram — только один аккаунт
    if (data.telegramId) {
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE telegram_id = ?',
        [data.telegramId]
      );
      if ((existing as any[]).length > 0) {
        return NextResponse.json({ error: 'Пользователь с таким Telegram ID уже существует' }, { status: 400 });
      }
    }

    const telegramUsernameNorm = data.telegramUsername ? String(data.telegramUsername).trim().replace(/^@/, '') : '';
    if (telegramUsernameNorm) {
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE LOWER(TRIM(REPLACE(COALESCE(telegram_username,\'\'), \'@\', \'\'))) = LOWER(?) AND COALESCE(telegram_username,\'\') != \'\'',
        [telegramUsernameNorm]
      );
      if ((existing as any[]).length > 0) {
        return NextResponse.json({ error: 'Пользователь с таким Telegram username уже существует' }, { status: 400 });
      }
    }

    if (data.discordId && String(data.discordId).trim()) {
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE discord_id = ?',
        [data.discordId.trim()]
      );
      if ((existing as any[]).length > 0) {
        return NextResponse.json({ error: 'Пользователь с таким Discord ID уже существует' }, { status: 400 });
      }
    }

    const emailNorm = data.email ? String(data.email).trim() : '';
    if (emailNorm) {
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND email IS NOT NULL AND email != \'\'',
        [emailNorm]
      );
      if ((existing as any[]).length > 0) {
        return NextResponse.json({ error: 'Пользователь с такой почтой уже существует' }, { status: 400 });
      }
    }

    const userId = crypto.randomUUID();

    await connection.execute(`
      INSERT INTO users (id, telegram_id, telegram_username, telegram_first_name, discord_id, discord_username, email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      data.telegramId || null,
      data.telegramUsername || null,
      data.telegramFirstName || data.name || null,
      data.discordId || null,
      data.discordUsername || null,
      data.email || null
    ]);

    // Создаём подписку если запрошено
    let subscriptionId = null;
    if (data.createSubscription && data.subscriptionEndDate) {
      subscriptionId = crypto.randomUUID();
      const now = new Date();
      const endDate = new Date(data.subscriptionEndDate);
      const isFree = Boolean(data.subscriptionIsFree);

      // Получаем информацию о тарифе если указан (для платной подписки)
      let periodMonths = 1;
      if (!isFree && data.tariffPriceId) {
        try {
          const [priceRows] = await connection.execute(
            'SELECT period_months FROM tariff_prices WHERE id = ?',
            [data.tariffPriceId]
          );
          if ((priceRows as any[]).length > 0) {
            periodMonths = (priceRows as any[])[0].period_months;
          }
        } catch (e) {
          // Игнорируем, если таблица не существует
        }
      }

      try {
        const [col] = await connection.execute(`
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'is_free'
        `);
        if ((col as any[]).length === 0) {
          await connection.execute(`ALTER TABLE subscriptions ADD COLUMN is_free TINYINT(1) DEFAULT 0`);
        }
      } catch (_) {}

      await connection.execute(`
        INSERT INTO subscriptions (id, user_id, tariff_id, tariff_price_id, period_months, amount, currency, status, start_date, end_date, is_free)
        VALUES (?, ?, ?, ?, ?, ?, 'USDT', 'active', ?, ?, ?)
      `, [
        subscriptionId,
        userId,
        isFree ? null : (data.tariffId || null),
        isFree ? null : (data.tariffPriceId || null),
        periodMonths,
        isFree ? 0 : (data.subscriptionAmount || 0),
        now,
        endDate,
        isFree ? 1 : 0
      ]);
    }

    return NextResponse.json({ 
      id: userId,
      subscriptionId,
      message: data.createSubscription 
        ? 'Пользователь и подписка созданы успешно' 
        : 'Пользователь создан успешно'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Не удалось создать пользователя' }, { status: 500 });
  } finally {
    connection.release();
  }
}
