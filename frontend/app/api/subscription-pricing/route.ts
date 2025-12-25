import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnection } from '@/lib/database';
import { SubscriptionPricing, UpdateSubscriptionPricingData } from '@/types/pricing';

// GET /api/subscription-pricing - получить все цены подписок
export async function GET(request: NextRequest) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(`
      SELECT * FROM subscription_pricing 
      ORDER BY period_months ASC
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No subscription pricing found' }, { status: 404 });
    }

    const pricing: SubscriptionPricing[] = (rows as any[]).map(row => ({
      id: row.id,
      periodMonths: row.period_months,
      monthlyPrice: parseFloat(row.monthly_price),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json(pricing);
  } catch (error) {
    console.error('Error fetching subscription pricing:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription pricing' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/subscription-pricing - обновить цены подписок
export async function PUT(request: NextRequest) {
  try {
    // Проверка аутентификации администратора
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    const data: UpdateSubscriptionPricingData[] = await request.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const connection = await getConnection();
    try {
      // Обновляем каждую цену
      for (const item of data) {
        if (!item.periodMonths || !item.monthlyPrice || item.monthlyPrice <= 0) {
          return NextResponse.json({ 
            error: `Invalid data for period ${item.periodMonths}` 
          }, { status: 400 });
        }

      // Проверяем, существует ли запись
      const [existing] = await connection.execute(
        'SELECT id FROM subscription_pricing WHERE period_months = ?',
        [item.periodMonths]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        // Обновляем существующую запись
        await connection.execute(
          `UPDATE subscription_pricing 
           SET monthly_price = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE period_months = ?`,
          [item.monthlyPrice, item.periodMonths]
        );
      } else {
        // Создаем новую запись
        const id = crypto.randomUUID();
        await connection.execute(
          `INSERT INTO subscription_pricing (id, period_months, monthly_price) 
           VALUES (?, ?, ?)`,
          [id, item.periodMonths, item.monthlyPrice]
        );
      }
    }

      return NextResponse.json({ message: 'Subscription pricing updated successfully' });
    } catch (error) {
      console.error('Error updating subscription pricing:', error);
      return NextResponse.json({ error: 'Failed to update subscription pricing' }, { status: 500 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in PUT handler:', error);
    return NextResponse.json({ error: 'Failed to update subscription pricing' }, { status: 500 });
  }
}

