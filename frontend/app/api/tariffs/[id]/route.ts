import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnection } from '@/lib/database';
import { Tariff, TariffPrice, UpdateTariffData } from '@/types/tariff';

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

// GET /api/tariffs/[id] - получить тариф по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM tariffs WHERE id = ?',
      [id]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    // Получаем цены
    const [priceRows] = await connection.execute(
      'SELECT * FROM tariff_prices WHERE tariff_id = ? ORDER BY sort_order ASC, period_months ASC',
      [id]
    );
    
    const prices = (priceRows as any[]).map(rowToTariffPrice);
    const tariff = rowToTariff((rows as any[])[0], prices);

    // Получаем статистику использования тарифа
    let usageStats = { totalSubscriptions: 0, activeSubscriptions: 0, totalRevenue: 0 };
    try {
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          COALESCE(SUM(amount), 0) as revenue
        FROM subscriptions
        WHERE tariff_id = ?
      `, [id]);

      if (Array.isArray(stats) && stats.length > 0) {
        usageStats = {
          totalSubscriptions: (stats[0] as any).total || 0,
          activeSubscriptions: (stats[0] as any).active || 0,
          totalRevenue: parseFloat((stats[0] as any).revenue) || 0
        };
      }
    } catch (e) {
      // Игнорируем если subscriptions не существует
    }

    // Получаем историю изменений
    const [history] = await connection.execute(`
      SELECT * FROM tariff_history 
      WHERE tariff_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [id]);

    return NextResponse.json({
      tariff,
      usageStats,
      history: (history as any[]).map(h => ({
        id: h.id,
        tariffId: h.tariff_id,
        changedBy: h.changed_by,
        changeType: h.change_type,
        oldValues: h.old_values ? (typeof h.old_values === 'string' ? JSON.parse(h.old_values) : h.old_values) : null,
        newValues: h.new_values ? (typeof h.new_values === 'string' ? JSON.parse(h.new_values) : h.new_values) : null,
        createdAt: h.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching tariff:', error);
    return NextResponse.json({ error: 'Failed to fetch tariff' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/tariffs/[id] - обновить тариф
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const data: UpdateTariffData = await request.json();

  const connection = await getConnection();
  try {
    // Получаем текущие значения
    const [currentRows] = await connection.execute(
      'SELECT * FROM tariffs WHERE id = ?',
      [id]
    );

    if (!Array.isArray(currentRows) || currentRows.length === 0) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    const [currentPrices] = await connection.execute(
      'SELECT * FROM tariff_prices WHERE tariff_id = ?',
      [id]
    );
    const currentTariff = rowToTariff(
      (currentRows as any[])[0], 
      (currentPrices as any[]).map(rowToTariffPrice)
    );

    // Строим запрос на обновление тарифа
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name.trim());
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description || null);
    }
    if (data.features !== undefined) {
      updates.push('features = ?');
      values.push(JSON.stringify(data.features));
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }
    if (data.isArchived !== undefined) {
      updates.push('is_archived = ?');
      values.push(data.isArchived ? 1 : 0);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(data.sortOrder);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.badge !== undefined) {
      updates.push('badge = ?');
      values.push(data.badge || null);
    }

    if (updates.length > 0) {
      values.push(id);
      await connection.execute(
        `UPDATE tariffs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    }

    // Обновляем цены если переданы
    if (data.prices && data.prices.length > 0) {
      // Удаляем старые цены
      await connection.execute('DELETE FROM tariff_prices WHERE tariff_id = ?', [id]);
      
      // Создаём новые
      for (let i = 0; i < data.prices.length; i++) {
        const price = data.prices[i];
        const priceId = crypto.randomUUID();
        
        await connection.execute(`
          INSERT INTO tariff_prices (id, tariff_id, period_months, monthly_price, is_popular, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          priceId,
          id,
          price.periodMonths,
          price.monthlyPrice,
          price.isPopular ? 1 : 0,
          price.sortOrder ?? i
        ]);
      }
    }

    // Определяем тип изменения для истории
    let changeType: string = 'updated';
    if (data.isArchived === true && !currentTariff.isArchived) {
      changeType = 'archived';
    } else if (data.isActive === false && currentTariff.isActive) {
      changeType = 'deactivated';
    } else if (data.isActive === true && !currentTariff.isActive) {
      changeType = 'activated';
    }

    // Записываем в историю
    const historyId = crypto.randomUUID();
    await connection.execute(`
      INSERT INTO tariff_history (id, tariff_id, change_type, old_values, new_values)
      VALUES (?, ?, ?, ?, ?)
    `, [
      historyId,
      id,
      changeType,
      JSON.stringify(currentTariff),
      JSON.stringify(data)
    ]);

    // Возвращаем обновлённый тариф с ценами
    const [rows] = await connection.execute('SELECT * FROM tariffs WHERE id = ?', [id]);
    const [priceRows] = await connection.execute(
      'SELECT * FROM tariff_prices WHERE tariff_id = ? ORDER BY sort_order ASC, period_months ASC',
      [id]
    );
    
    const prices = (priceRows as any[]).map(rowToTariffPrice);
    const tariff = rowToTariff((rows as any[])[0], prices);

    return NextResponse.json(tariff);
  } catch (error) {
    console.error('Error updating tariff:', error);
    return NextResponse.json({ error: 'Failed to update tariff' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/tariffs/[id] - удалить тариф (мягкое удаление - архивация)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const hardDelete = searchParams.get('hard') === 'true';

  const connection = await getConnection();
  try {
    // Проверяем существование
    const [rows] = await connection.execute(
      'SELECT * FROM tariffs WHERE id = ?',
      [id]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    const [priceRows] = await connection.execute(
      'SELECT * FROM tariff_prices WHERE tariff_id = ?',
      [id]
    );
    const tariff = rowToTariff(
      (rows as any[])[0],
      (priceRows as any[]).map(rowToTariffPrice)
    );

    // Проверяем использование в подписках
    let hasSubscriptions = false;
    try {
      const [subs] = await connection.execute(
        'SELECT COUNT(*) as count FROM subscriptions WHERE tariff_id = ?',
        [id]
      );
      hasSubscriptions = (subs as any[])[0]?.count > 0;
    } catch (e) {
      // Игнорируем если таблицы нет
    }

    if (hardDelete) {
      if (hasSubscriptions) {
        return NextResponse.json({ 
          error: 'Cannot delete tariff with existing subscriptions. Archive it instead.' 
        }, { status: 400 });
      }

      // Удаляем цены
      await connection.execute('DELETE FROM tariff_prices WHERE tariff_id = ?', [id]);
      // Удаляем историю
      await connection.execute('DELETE FROM tariff_history WHERE tariff_id = ?', [id]);
      // Удаляем тариф
      await connection.execute('DELETE FROM tariffs WHERE id = ?', [id]);

      return NextResponse.json({ message: 'Tariff deleted permanently' });
    } else {
      // Мягкое удаление - архивация
      await connection.execute(
        'UPDATE tariffs SET is_archived = 1, is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      // Записываем в историю
      const historyId = crypto.randomUUID();
      await connection.execute(`
        INSERT INTO tariff_history (id, tariff_id, change_type, old_values, new_values)
        VALUES (?, ?, 'archived', ?, ?)
      `, [
        historyId,
        id,
        JSON.stringify(tariff),
        JSON.stringify({ isArchived: true, isActive: false })
      ]);

      return NextResponse.json({ message: 'Tariff archived successfully' });
    }
  } catch (error) {
    console.error('Error deleting tariff:', error);
    return NextResponse.json({ error: 'Failed to delete tariff' }, { status: 500 });
  } finally {
    connection.release();
  }
}
