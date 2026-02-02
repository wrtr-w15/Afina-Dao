import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

async function ensureTables() {
  const connection = await getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS promocodes (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(64) UNIQUE NOT NULL,
        type ENUM('mass', 'personal') NOT NULL DEFAULT 'mass',
        discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        max_uses INT DEFAULT NULL,
        used_count INT DEFAULT 0,
        allowed_users JSON NULL,
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
  } finally {
    connection.release();
  }
}

export async function POST(request: NextRequest) {
  let connection: Awaited<ReturnType<typeof getConnection>> | null = null;
  try {
    await ensureTables();
    connection = await getConnection();
    const body = await request.json();

    const { code, telegramUsername, amount, periodMonths, tariffId } = body;

    if (!code || !amount) {
      return NextResponse.json(
        { error: 'Code and amount are required' },
        { status: 400 }
      );
    }

    const [promocodes] = await connection.execute(
      `SELECT * FROM promocodes WHERE code = ? AND is_active = TRUE`,
      [code.toUpperCase().trim()]
    );
    
    const promocode = (promocodes as any[])[0];
    
    if (!promocode) {
      return NextResponse.json(
        { valid: false, error: 'Promocode not found or inactive' },
        { status: 200 }
      );
    }
    
    // Проверка срока действия
    const now = new Date();
    if (promocode.valid_from) {
      const validFrom = new Date(promocode.valid_from);
      if (now < validFrom) {
        return NextResponse.json(
          { valid: false, error: `Promocode is not yet active. It will be available from ${validFrom.toLocaleDateString('ru-RU')}` },
          { status: 200 }
        );
      }
    }
    if (promocode.valid_until) {
      const validUntil = new Date(promocode.valid_until);
      if (now > validUntil) {
        return NextResponse.json(
          { valid: false, error: `Promocode has expired. It was valid until ${validUntil.toLocaleDateString('ru-RU')}` },
          { status: 200 }
        );
      }
    }
    
    // Проверка лимита использований
    if (promocode.max_uses !== null && promocode.used_count >= promocode.max_uses) {
      return NextResponse.json(
        { valid: false, error: 'Promocode usage limit reached' },
        { status: 200 }
      );
    }
    
    // Проверка для персональных промокодов
    if (promocode.type === 'personal') {
      if (!telegramUsername) {
        return NextResponse.json(
          { valid: false, error: 'Telegram username required for personal promocode' },
          { status: 200 }
        );
      }
      
      const allowedUsers = promocode.allowed_users 
        ? JSON.parse(promocode.allowed_users) 
        : [];
      
      const usernameClean = telegramUsername.replace('@', '').toLowerCase();
      const isAllowed = allowedUsers.some((u: string) => 
        u.replace('@', '').toLowerCase() === usernameClean
      );
      
      if (!isAllowed) {
        return NextResponse.json(
          { valid: false, error: 'This promocode is not available for your account' },
          { status: 200 }
        );
      }
    }
    
    // Проверка разрешенных тарифов
    if (promocode.allowed_tariff_ids) {
      try {
        const allowedTariffIds = typeof promocode.allowed_tariff_ids === 'string'
          ? JSON.parse(promocode.allowed_tariff_ids)
          : promocode.allowed_tariff_ids;
        
        if (Array.isArray(allowedTariffIds) && allowedTariffIds.length > 0) {
          if (!tariffId) {
            return NextResponse.json(
              { valid: false, error: 'Tariff ID is required for this promocode' },
              { status: 200 }
            );
          }
          
          if (!allowedTariffIds.includes(tariffId)) {
            return NextResponse.json(
              { valid: false, error: 'This promocode is not available for the selected tariff' },
              { status: 200 }
            );
          }
        }
      } catch (e) {
        console.error('Error parsing allowed_tariff_ids:', e);
      }
    }
    
    // Расчет скидки в зависимости от типа
    let discountAmount = 0;
    let finalAmount = amount;
    
    if (promocode.discount_type === 'percent') {
      discountAmount = (amount * (promocode.discount_percent || 0)) / 100;
      finalAmount = amount - discountAmount;
    } else if (promocode.discount_type === 'fixed') {
      discountAmount = promocode.discount_amount || 0;
      finalAmount = Math.max(0, amount - discountAmount); // Не может быть отрицательным
    }
    
    // Получаем дополнительные дни для указанного периода подписки
    let extraDays = 0;
    if (promocode.extra_days && periodMonths) {
      try {
        const extraDaysMap = typeof promocode.extra_days === 'string' 
          ? JSON.parse(promocode.extra_days) 
          : promocode.extra_days;
        if (extraDaysMap && typeof extraDaysMap === 'object') {
          const periodKey = String(periodMonths);
          if (extraDaysMap[periodKey]) {
            extraDays = parseInt(String(extraDaysMap[periodKey])) || 0;
          }
        }
      } catch (e) {
        console.error('Error parsing extra_days:', e);
      }
    }
    
    return NextResponse.json({
      valid: true,
      promocode: {
        id: promocode.id,
        code: promocode.code,
        discount_type: promocode.discount_type,
        discount_percent: promocode.discount_percent,
        discount_amount: promocode.discount_amount,
        calculated_discount: discountAmount,
        original_amount: amount,
        final_amount: finalAmount,
        extra_days: extraDays
      }
    });
  } catch (error: any) {
    console.error('Error checking promocode:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to check promocode', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
