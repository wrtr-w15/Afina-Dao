import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

async function ensureTables() {
  const connection = await getConnection();
  
  // Таблица промокодов
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS promocodes (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      type ENUM('mass', 'personal') NOT NULL DEFAULT 'mass',
      discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
      discount_percent DECIMAL(5,2) NULL DEFAULT 0,
      discount_amount DECIMAL(10,2) NULL DEFAULT 0,
      max_uses INT DEFAULT NULL,
      used_count INT DEFAULT 0,
      allowed_users JSON NULL,
      allowed_tariff_ids JSON NULL COMMENT 'Список разрешенных tariff_id для использования промокода. Если NULL - промокод доступен для всех тарифов',
      extra_days JSON NULL COMMENT 'Дополнительные дни по периодам подписки: {"1": 7, "3": 14} означает +7 дней для 1 месяца, +14 для 3 месяцев',
      is_active BOOLEAN DEFAULT TRUE,
      valid_from DATETIME NULL,
      valid_until DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_active (is_active),
      INDEX idx_valid_dates (valid_from, valid_until)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  
  // Добавляем колонку extra_days если её нет
  try {
    await connection.execute(`ALTER TABLE promocodes ADD COLUMN extra_days JSON NULL COMMENT 'Дополнительные дни по периодам подписки: {"1": 7, "3": 14} означает +7 дней для 1 месяца, +14 для 3 месяцев'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column name')) throw e;
  }
  
  // Добавляем колонку allowed_tariff_ids если её нет
  try {
    await connection.execute(`ALTER TABLE promocodes ADD COLUMN allowed_tariff_ids JSON NULL COMMENT 'Список разрешенных tariff_id для использования промокода. Если NULL - промокод доступен для всех тарифов'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column name')) throw e;
  }
  
  // Добавляем колонки для дат и типа скидки, если их еще нет
  try {
    await connection.execute(`ALTER TABLE promocodes ADD COLUMN valid_from DATETIME NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column name')) throw e;
  }
  try {
    await connection.execute(`ALTER TABLE promocodes ADD COLUMN valid_until DATETIME NULL`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column name')) throw e;
  }
  try {
    await connection.execute(`ALTER TABLE promocodes ADD COLUMN discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent'`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column name')) throw e;
  }
  try {
    await connection.execute(`ALTER TABLE promocodes ADD COLUMN discount_amount DECIMAL(10,2) NULL DEFAULT 0`);
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column name')) throw e;
  }
  
  // Таблица использований промокодов
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS promocode_usages (
      id VARCHAR(36) PRIMARY KEY,
      promocode_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      subscription_id VARCHAR(36) NULL,
      amount DECIMAL(10,2) NOT NULL,
      discount_amount DECIMAL(10,2) NOT NULL,
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (promocode_id) REFERENCES promocodes(id) ON DELETE CASCADE,
      INDEX idx_promocode (promocode_id),
      INDEX idx_user (user_id),
      INDEX idx_subscription (subscription_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function GET(request: NextRequest) {
  try {
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    await ensureTables();
    const connection = await getConnection();
    
    const [promocodes] = await connection.execute(`
      SELECT 
        p.*,
        COALESCE(SUM(pu.amount), 0) as total_revenue,
        COUNT(pu.id) as total_usages
      FROM promocodes p
      LEFT JOIN promocode_usages pu ON p.id = pu.promocode_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    
    return NextResponse.json({ promocodes });
  } catch (error: any) {
    console.error('Error fetching promocodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promocodes', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    await ensureTables();
    const connection = await getConnection();
    const body = await request.json();
    
    const {
      code,
      type = 'mass',
      discount_type = 'percent',
      discount_percent = null,
      discount_amount = null,
      max_uses = null,
      allowed_users = [],
      allowed_tariff_ids = null,
      extra_days = null,
      is_active = true,
      valid_from = null,
      valid_until = null
    } = body;
    
    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }
    
    if (discount_type === 'percent') {
      if (discount_percent === null || discount_percent === undefined) {
        return NextResponse.json(
          { error: 'discount_percent is required for percent discount type' },
          { status: 400 }
        );
      }
      if (discount_percent < 0 || discount_percent > 100) {
        return NextResponse.json(
          { error: 'Discount percent must be between 0 and 100' },
          { status: 400 }
        );
      }
    } else if (discount_type === 'fixed') {
      if (discount_amount === null || discount_amount === undefined) {
        return NextResponse.json(
          { error: 'discount_amount is required for fixed discount type' },
          { status: 400 }
        );
      }
      if (discount_amount <= 0) {
        return NextResponse.json(
          { error: 'Discount amount must be greater than 0' },
          { status: 400 }
        );
      }
    }
    
    if (type === 'personal' && (!Array.isArray(allowed_users) || allowed_users.length === 0)) {
      return NextResponse.json(
        { error: 'Personal promocodes require at least one allowed user' },
        { status: 400 }
      );
    }
    
    const id = crypto.randomUUID();
    const allowedUsersJson = type === 'personal' ? JSON.stringify(allowed_users) : null;
    
    // Валидация allowed_tariff_ids (должен быть массивом строк или null)
    let allowedTariffIdsJson = null;
    if (allowed_tariff_ids !== null && allowed_tariff_ids !== undefined) {
      if (!Array.isArray(allowed_tariff_ids)) {
        return NextResponse.json(
          { error: 'allowed_tariff_ids must be an array of tariff IDs or null' },
          { status: 400 }
        );
      }
      // Проверяем, что все элементы - строки
      if (allowed_tariff_ids.some(id => typeof id !== 'string')) {
        return NextResponse.json(
          { error: 'All elements in allowed_tariff_ids must be strings' },
          { status: 400 }
        );
      }
      if (allowed_tariff_ids.length > 0) {
        allowedTariffIdsJson = JSON.stringify(allowed_tariff_ids);
      }
    }
    
    // Валидация extra_days (должен быть объектом, где ключи - периоды в месяцах, значения - дни)
    let extraDaysJson = null;
    if (extra_days) {
      if (typeof extra_days !== 'object' || Array.isArray(extra_days)) {
        return NextResponse.json(
          { error: 'extra_days must be an object with period months as keys and days as values' },
          { status: 400 }
        );
      }
      // Проверяем, что все значения - положительные числа
      for (const [period, days] of Object.entries(extra_days)) {
        const periodNum = parseInt(period);
        const daysNum = parseInt(String(days));
        if (isNaN(periodNum) || isNaN(daysNum) || periodNum <= 0 || daysNum <= 0) {
          return NextResponse.json(
            { error: `Invalid extra_days: period ${period} must be a positive number, days must be a positive number` },
            { status: 400 }
          );
        }
      }
      extraDaysJson = JSON.stringify(extra_days);
    }
    
    // Валидация дат
    let validFromDate = null;
    let validUntilDate = null;
    if (valid_from) {
      validFromDate = new Date(valid_from);
      if (isNaN(validFromDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid valid_from date format' },
          { status: 400 }
        );
      }
    }
    if (valid_until) {
      validUntilDate = new Date(valid_until);
      if (isNaN(validUntilDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid valid_until date format' },
          { status: 400 }
        );
      }
    }
    if (validFromDate && validUntilDate && validFromDate >= validUntilDate) {
      return NextResponse.json(
        { error: 'valid_from must be before valid_until' },
        { status: 400 }
      );
    }
    
    await connection.execute(
      `INSERT INTO promocodes (id, code, type, discount_type, discount_percent, discount_amount, max_uses, allowed_users, allowed_tariff_ids, extra_days, is_active, valid_from, valid_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code.toUpperCase().trim(), type, discount_type, discount_percent, discount_amount, max_uses, allowedUsersJson, allowedTariffIdsJson, extraDaysJson, is_active, validFromDate, validUntilDate]
    );
    
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Error creating promocode:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Promocode with this code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create promocode', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    await ensureTables();
    const connection = await getConnection();
    const body = await request.json();
    
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (updates.code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(updates.code.toUpperCase().trim());
    }
    if (updates.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(updates.type);
    }
    if (updates.discount_type !== undefined) {
      updateFields.push('discount_type = ?');
      updateValues.push(updates.discount_type);
    }
    if (updates.discount_percent !== undefined) {
      if (updates.discount_percent !== null && (updates.discount_percent < 0 || updates.discount_percent > 100)) {
        return NextResponse.json(
          { error: 'Discount percent must be between 0 and 100' },
          { status: 400 }
        );
      }
      updateFields.push('discount_percent = ?');
      updateValues.push(updates.discount_percent);
    }
    if (updates.discount_amount !== undefined) {
      if (updates.discount_amount !== null && updates.discount_amount <= 0) {
        return NextResponse.json(
          { error: 'Discount amount must be greater than 0' },
          { status: 400 }
        );
      }
      updateFields.push('discount_amount = ?');
      updateValues.push(updates.discount_amount);
    }
    if (updates.max_uses !== undefined) {
      updateFields.push('max_uses = ?');
      updateValues.push(updates.max_uses);
    }
    if (updates.allowed_users !== undefined) {
      const allowedUsersJson = updates.type === 'personal' && Array.isArray(updates.allowed_users)
        ? JSON.stringify(updates.allowed_users)
        : null;
      updateFields.push('allowed_users = ?');
      updateValues.push(allowedUsersJson);
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(updates.is_active);
    }
    if (updates.valid_from !== undefined) {
      const validFromDate = updates.valid_from ? new Date(updates.valid_from) : null;
      if (updates.valid_from && isNaN(validFromDate!.getTime())) {
        return NextResponse.json(
          { error: 'Invalid valid_from date format' },
          { status: 400 }
        );
      }
      updateFields.push('valid_from = ?');
      updateValues.push(validFromDate);
    }
    if (updates.valid_until !== undefined) {
      const validUntilDate = updates.valid_until ? new Date(updates.valid_until) : null;
      if (updates.valid_until && isNaN(validUntilDate!.getTime())) {
        return NextResponse.json(
          { error: 'Invalid valid_until date format' },
          { status: 400 }
        );
      }
      updateFields.push('valid_until = ?');
      updateValues.push(validUntilDate);
    }
    if (updates.allowed_tariff_ids !== undefined) {
      let allowedTariffIdsJson = null;
      if (updates.allowed_tariff_ids !== null && updates.allowed_tariff_ids !== undefined) {
        if (!Array.isArray(updates.allowed_tariff_ids)) {
          return NextResponse.json(
            { error: 'allowed_tariff_ids must be an array of tariff IDs or null' },
            { status: 400 }
          );
        }
        if (updates.allowed_tariff_ids.some((id: any) => typeof id !== 'string')) {
          return NextResponse.json(
            { error: 'All elements in allowed_tariff_ids must be strings' },
            { status: 400 }
          );
        }
        if (updates.allowed_tariff_ids.length > 0) {
          allowedTariffIdsJson = JSON.stringify(updates.allowed_tariff_ids);
        }
      }
      updateFields.push('allowed_tariff_ids = ?');
      updateValues.push(allowedTariffIdsJson);
    }
    if (updates.extra_days !== undefined) {
      let extraDaysJson = null;
      if (updates.extra_days) {
        if (typeof updates.extra_days !== 'object' || Array.isArray(updates.extra_days)) {
          return NextResponse.json(
            { error: 'extra_days must be an object with period months as keys and days as values' },
            { status: 400 }
          );
        }
        // Проверяем, что все значения - положительные числа
        for (const [period, days] of Object.entries(updates.extra_days)) {
          const periodNum = parseInt(period);
          const daysNum = parseInt(String(days));
          if (isNaN(periodNum) || isNaN(daysNum) || periodNum <= 0 || daysNum <= 0) {
            return NextResponse.json(
              { error: `Invalid extra_days: period ${period} must be a positive number, days must be a positive number` },
              { status: 400 }
            );
          }
        }
        extraDaysJson = JSON.stringify(updates.extra_days);
      }
      updateFields.push('extra_days = ?');
      updateValues.push(extraDaysJson);
    }
    
    // Проверка что valid_from < valid_until если оба указаны
    if (updates.valid_from !== undefined && updates.valid_until !== undefined) {
      const fromDate = updates.valid_from ? new Date(updates.valid_from) : null;
      const untilDate = updates.valid_until ? new Date(updates.valid_until) : null;
      if (fromDate && untilDate && fromDate >= untilDate) {
        return NextResponse.json(
          { error: 'valid_from must be before valid_until' },
          { status: 400 }
        );
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    updateValues.push(id);
    
    await connection.execute(
      `UPDATE promocodes SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating promocode:', error);
    return NextResponse.json(
      { error: 'Failed to update promocode', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    await ensureTables();
    const connection = await getConnection();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    await connection.execute('DELETE FROM promocodes WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting promocode:', error);
    return NextResponse.json(
      { error: 'Failed to delete promocode', details: error.message },
      { status: 500 }
    );
  }
}
