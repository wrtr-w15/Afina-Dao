import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import crypto from 'crypto';

// POST /api/users/[id]/subscriptions - создать подписку для пользователя
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id: userId } = await params;
  if (!userId || typeof userId !== 'string' || userId.length > 64 || /[^\w\-]/.test(userId)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }
  const data = await request.json();
  const connection = await getConnection();

  try {
    // Проверяем существует ли пользователь
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if ((users as any[]).length === 0) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const subscriptionId = crypto.randomUUID();
    const now = new Date();
    const endDate = data.endDate ? new Date(data.endDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Получаем информацию о тарифе если указан
    let periodMonths = 1;
    if (data.tariffPriceId) {
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

    // Рассчитываем период в месяцах по датам если не указан тариф
    if (!data.tariffPriceId) {
      const diffTime = endDate.getTime() - now.getTime();
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
      periodMonths = Math.max(1, diffMonths);
    }

    await connection.execute(`
      INSERT INTO subscriptions (
        id, user_id, tariff_id, tariff_price_id, period_months, 
        amount, currency, status, start_date, end_date
      )
      VALUES (?, ?, ?, ?, ?, ?, 'USDT', 'active', ?, ?)
    `, [
      subscriptionId,
      userId,
      data.tariffId || null,
      data.tariffPriceId || null,
      periodMonths,
      data.amount || 0,
      now,
      endDate
    ]);

    return NextResponse.json({
      id: subscriptionId,
      message: 'Подписка успешно создана'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Не удалось создать подписку' }, { status: 500 });
  } finally {
    connection.release();
  }
}
