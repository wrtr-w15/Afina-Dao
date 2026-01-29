import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnection } from '@/lib/database';
import { SubscriptionPricing, UpdateSubscriptionPricingData } from '@/types/pricing';

// Проверяем и создаём колонки is_active и is_popular если их нет
async function ensureColumns(connection: any): Promise<void> {
  try {
    // Проверяем наличие колонок
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'subscription_pricing' 
      AND COLUMN_NAME IN ('is_active', 'is_popular')
    `);
    
    const columnNames = (columns as any[]).map(c => c.COLUMN_NAME);
    
    // Добавляем is_active если нет
    if (!columnNames.includes('is_active')) {
      console.log('Adding is_active column to subscription_pricing table');
      await connection.execute(`
        ALTER TABLE subscription_pricing 
        ADD COLUMN is_active TINYINT(1) DEFAULT 1
      `);
    }
    
    // Добавляем is_popular если нет
    if (!columnNames.includes('is_popular')) {
      console.log('Adding is_popular column to subscription_pricing table');
      await connection.execute(`
        ALTER TABLE subscription_pricing 
        ADD COLUMN is_popular TINYINT(1) DEFAULT 0
      `);
    }
  } catch (error) {
    console.error('Error ensuring columns:', error);
    // Продолжаем работу даже если не удалось создать колонки
  }
}

// POST /api/subscription-pricing - создать новый период подписки
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const data = await request.json();
  
  if (!data.periodMonths || data.periodMonths < 1 || !data.monthlyPrice || data.monthlyPrice <= 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    // Убеждаемся что колонки существуют
    await ensureColumns(connection);
    
    const [existing] = await connection.execute(
      'SELECT id FROM subscription_pricing WHERE period_months = ?',
      [data.periodMonths]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: 'Period already exists' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    
    await connection.execute(
      `INSERT INTO subscription_pricing (id, period_months, monthly_price, is_active, is_popular) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.periodMonths, data.monthlyPrice, 1, 0]
    );

    return NextResponse.json({ 
      id, 
      periodMonths: data.periodMonths, 
      monthlyPrice: data.monthlyPrice,
      isActive: true,
      isPopular: false
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription pricing:', error);
    return NextResponse.json({ error: 'Failed to create subscription pricing' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/subscription-pricing - удалить период подписки
export async function DELETE(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const periodMonths = searchParams.get('periodMonths');
  
  if (!periodMonths) {
    return NextResponse.json({ error: 'periodMonths is required' }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    await connection.execute(
      'DELETE FROM subscription_pricing WHERE period_months = ?',
      [parseInt(periodMonths)]
    );

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription pricing:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// GET /api/subscription-pricing - получить все цены подписок
export async function GET(request: NextRequest) {
  const connection = await getConnection();
  try {
    // Убеждаемся что колонки существуют
    await ensureColumns(connection);
    
    const [rows] = await connection.execute(`
      SELECT * FROM subscription_pricing 
      ORDER BY period_months ASC
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json([]);
    }

    const pricing: SubscriptionPricing[] = (rows as any[]).map(row => ({
      id: row.id,
      periodMonths: row.period_months,
      monthlyPrice: parseFloat(row.monthly_price),
      isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
      isPopular: row.is_popular !== undefined ? Boolean(row.is_popular) : false,
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
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const data: UpdateSubscriptionPricingData[] = await request.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    // Убеждаемся что колонки существуют
    await ensureColumns(connection);
    
    // Сбрасываем is_popular у всех, если есть новый популярный
    const hasNewPopular = data.some(item => item.isPopular === true);
    if (hasNewPopular) {
      await connection.execute('UPDATE subscription_pricing SET is_popular = 0');
    }
    
    for (const item of data) {
      if (!item.periodMonths || !item.monthlyPrice || item.monthlyPrice <= 0) {
        return NextResponse.json({ 
          error: `Invalid data for period ${item.periodMonths}` 
        }, { status: 400 });
      }

      const [existing] = await connection.execute(
        'SELECT id FROM subscription_pricing WHERE period_months = ?',
        [item.periodMonths]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        // Обновляем существующую запись
        await connection.execute(
          `UPDATE subscription_pricing 
           SET monthly_price = ?, 
               is_active = ?, 
               is_popular = ?,
               updated_at = CURRENT_TIMESTAMP 
           WHERE period_months = ?`,
          [
            item.monthlyPrice, 
            item.isActive !== undefined ? (item.isActive ? 1 : 0) : 1,
            item.isPopular !== undefined ? (item.isPopular ? 1 : 0) : 0,
            item.periodMonths
          ]
        );
      } else {
        // Создаем новую запись
        const id = crypto.randomUUID();
        await connection.execute(
          `INSERT INTO subscription_pricing (id, period_months, monthly_price, is_active, is_popular) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            id, 
            item.periodMonths, 
            item.monthlyPrice, 
            item.isActive !== undefined ? (item.isActive ? 1 : 0) : 1,
            item.isPopular !== undefined ? (item.isPopular ? 1 : 0) : 0
          ]
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
}
