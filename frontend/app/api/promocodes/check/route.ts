import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { applyRateLimit } from '@/lib/security-middleware';

/** Лимит проверок промокодов на IP в минуту (защита от перебора и нагрузки) */
const PROMOCHECK_RATE_LIMIT = 30;
const PROMOCHECK_WINDOW_MS = 60 * 1000;

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
    // Тариф по промокоду: при вводе промокода пользователю присваивается этот тариф вместо выбранного
    try {
      await connection.execute(`ALTER TABLE promocodes ADD COLUMN override_tariff_id VARCHAR(36) NULL COMMENT 'При применении промокода подписка оформляется на этот тариф'`);
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
  } finally {
    connection.release();
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = applyRateLimit(request, PROMOCHECK_RATE_LIMIT, PROMOCHECK_WINDOW_MS);
  if (rateLimitResult) return rateLimitResult;

  let connection: Awaited<ReturnType<typeof getConnection>> | null = null;
  try {
    await ensureTables();
    connection = await getConnection();
    const body = await request.json();

    const { code, telegramUsername, amount, periodMonths, tariffId } = body;

    const codeStr = typeof code === 'string' ? code.toUpperCase().trim() : '';
    if (!codeStr || codeStr.length > 64) {
      return NextResponse.json(
        { error: 'Code and amount are required' },
        { status: 400 }
      );
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-negative number' },
        { status: 400 }
      );
    }

    const [promocodes] = await connection.execute(
      `SELECT * FROM promocodes WHERE code = ? AND is_active = TRUE`,
      [codeStr]
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
      if (!telegramUsername || typeof telegramUsername !== 'string') {
        return NextResponse.json(
          { valid: false, error: 'Telegram username required for personal promocode' },
          { status: 200 }
        );
      }
      let allowedUsers: string[] = [];
      try {
        allowedUsers = promocode.allowed_users
          ? (typeof promocode.allowed_users === 'string' ? JSON.parse(promocode.allowed_users) : promocode.allowed_users)
          : [];
        if (!Array.isArray(allowedUsers)) allowedUsers = [];
      } catch {
        allowedUsers = [];
      }
      const usernameClean = String(telegramUsername).replace('@', '').toLowerCase();
      const isAllowed = allowedUsers.some((u: string) =>
        String(u).replace('@', '').toLowerCase() === usernameClean
      );
      if (!isAllowed) {
        return NextResponse.json(
          { valid: false, error: 'This promocode is not available for your account' },
          { status: 200 }
        );
      }
    }
    
    // Проверка разрешенных тарифов (не применяется, если промокод задаёт свой тариф — override_tariff_id)
    const overrideTariffId = promocode.override_tariff_id || null;
    if (!overrideTariffId && promocode.allowed_tariff_ids) {
      try {
        const allowedTariffIds = typeof promocode.allowed_tariff_ids === 'string'
          ? JSON.parse(promocode.allowed_tariff_ids)
          : promocode.allowed_tariff_ids;
        
        if (Array.isArray(allowedTariffIds) && allowedTariffIds.length > 0) {
          const tariffIdStr = tariffId != null ? String(tariffId) : '';
          if (!tariffIdStr) {
            return NextResponse.json(
              { valid: false, error: 'Tariff ID is required for this promocode' },
              { status: 200 }
            );
          }
          const allowedSet = new Set(allowedTariffIds.map((id: unknown) => String(id)));
          if (!allowedSet.has(tariffIdStr)) {
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
    
    // Если промокод присваивает другой тариф — берём цену для override-тарифа и того же периода
    let baseAmount = amountNum;
    let overrideTariffPriceId: string | null = null;
    let overrideTariffName: string | null = null;
    let overridePlanName: string | null = null;

    if (overrideTariffId && periodMonths) {
      const [tariffRows] = await connection.execute(
        `SELECT id, name FROM tariffs WHERE id = ? AND is_archived = 0`,
        [overrideTariffId]
      );
      const overrideTariff = (tariffRows as any[])[0];
      if (!overrideTariff) {
        return NextResponse.json(
          { valid: false, error: 'Tariff assigned by promocode is not available' },
          { status: 200 }
        );
      }
      // Цена для того же периода подписки, что выбрал пользователь
      const [priceRows] = await connection.execute(
        `SELECT id, period_months, monthly_price FROM tariff_prices WHERE tariff_id = ? AND period_months = ? LIMIT 1`,
        [overrideTariffId, periodMonths]
      );
      const priceRow = (priceRows as any[])[0];
      if (!priceRow) {
        return NextResponse.json(
          { valid: false, error: `Для тарифа по промокоду нет цены на период ${periodMonths} мес.` },
          { status: 200 }
        );
      }
      baseAmount = Number(priceRow.monthly_price) * Number(priceRow.period_months);
      overrideTariffPriceId = priceRow.id;
      overrideTariffName = overrideTariff.name;
      const periodMonthsUsed = Number(priceRow.period_months);
      overridePlanName = periodMonthsUsed === 1
        ? `${overrideTariff.name}, 1 месяц`
        : periodMonthsUsed < 5
          ? `${overrideTariff.name}, ${periodMonthsUsed} месяца`
          : `${overrideTariff.name}, ${periodMonthsUsed} месяцев`;
    }
    
    // Расчет скидки в зависимости от типа
    let discountAmount = 0;
    let finalAmount = baseAmount;
    
    if (promocode.discount_type === 'percent') {
      discountAmount = (baseAmount * (promocode.discount_percent || 0)) / 100;
      finalAmount = baseAmount - discountAmount;
    } else if (promocode.discount_type === 'fixed') {
      discountAmount = promocode.discount_amount || 0;
      finalAmount = Math.max(0, baseAmount - discountAmount); // Не может быть отрицательным
    }
    
    // Получаем дополнительные дни для указанного периода подписки
    let extraDays = 0;
    const periodForExtraDays = periodMonths;
    if (promocode.extra_days && periodForExtraDays) {
      try {
        const extraDaysMap = typeof promocode.extra_days === 'string' 
          ? JSON.parse(promocode.extra_days) 
          : promocode.extra_days;
        if (extraDaysMap && typeof extraDaysMap === 'object') {
          const periodKey = String(periodForExtraDays);
          if (extraDaysMap[periodKey]) {
            extraDays = parseInt(String(extraDaysMap[periodKey])) || 0;
          }
        }
      } catch (e) {
        console.error('Error parsing extra_days:', e);
      }
    }
    
    const response: Record<string, unknown> = {
      valid: true,
      promocode: {
        id: promocode.id,
        code: promocode.code,
        discount_type: promocode.discount_type,
        discount_percent: promocode.discount_percent,
        discount_amount: discountAmount, // рассчитанная сумма скидки для отображения
        original_amount: baseAmount,
        final_amount: finalAmount,
        extra_days: extraDays
      }
    };
    if (overrideTariffId && overrideTariffPriceId && overrideTariffName && overridePlanName) {
      (response.promocode as Record<string, unknown>).override_tariff_id = overrideTariffId;
      (response.promocode as Record<string, unknown>).override_tariff_price_id = overrideTariffPriceId;
      (response.promocode as Record<string, unknown>).override_tariff_name = overrideTariffName;
      (response.promocode as Record<string, unknown>).override_plan_name = overridePlanName;
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error checking promocode:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to check promocode',
        ...(process.env.NODE_ENV !== 'production' && error?.message ? { details: error.message } : {}),
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
