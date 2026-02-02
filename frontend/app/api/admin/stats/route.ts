import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

// GET /api/admin/stats — агрегированная статистика для страницы «Статистика»
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const recentLimit = Math.min(parseInt(searchParams.get('recent') || '10', 10) || 10, 50);

  const connection = await getConnection();
  try {
    // Платежи: всего, по статусам, суммы
    const [paymentStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' AND paid_at IS NOT NULL AND MONTH(paid_at) = MONTH(NOW()) AND YEAR(paid_at) = YEAR(NOW()) THEN amount ELSE 0 END), 0) as month_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' AND paid_at IS NOT NULL AND MONTH(paid_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(paid_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH)) THEN amount ELSE 0 END), 0) as last_month_amount
      FROM payments
    `);
    const pRow = (paymentStats as any[])[0] || {};

    // Подписки: всего, по статусам
    const [subStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM subscriptions
    `);
    const sRow = (subStats as any[])[0] || {};

    // Пользователи
    const [userCount] = await connection.execute(`SELECT COUNT(*) as total FROM users`);
    const usersTotal = (userCount as any[])[0]?.total ?? 0;

    // Пользователи с оплаченной подпиской (уникальные user_id с активной подпиской)
    const [paidSubCount] = await connection.execute(
      `SELECT COUNT(DISTINCT user_id) as total FROM subscriptions WHERE status = 'active'`
    );
    const usersWithPaidSubscription = Number((paidSubCount as any[])[0]?.total ?? 0);

    // Количество проектов
    let projectsTotal = 0;
    try {
      const [projCount] = await connection.execute(`SELECT COUNT(*) as total FROM projects`);
      projectsTotal = Number((projCount as any[])[0]?.total ?? 0);
    } catch {
      // таблица projects может отсутствовать
    }

    // Пользователи по каждому тарифу (активные подписки)
    let usersPerTariff: { tariffId: string; tariffName: string; count: number }[] = [];
    try {
      const [tariffRows] = await connection.execute(`
        SELECT s.tariff_id AS tariff_id, t.name AS tariff_name, COUNT(DISTINCT s.user_id) AS users_count
        FROM subscriptions s
        LEFT JOIN tariffs t ON t.id COLLATE utf8mb4_unicode_ci = s.tariff_id COLLATE utf8mb4_unicode_ci
        WHERE s.status = 'active' AND s.tariff_id IS NOT NULL
        GROUP BY s.tariff_id, t.name
        ORDER BY users_count DESC
      `);
      usersPerTariff = (tariffRows as any[]).map((r: any) => ({
        tariffId: r.tariff_id || '',
        tariffName: r.tariff_name || 'Без названия',
        count: Number(r.users_count) || 0
      }));
    } catch {
      // таблица tariffs может отсутствовать
    }

    // Оплаты по месяцам (последние 12 месяцев, только completed)
    let paymentsByMonth: { month: string; monthLabel: string; count: number; amount: number }[] = [];
    try {
      const [byMonthRows] = await connection.execute(`
        SELECT 
          YEAR(COALESCE(paid_at, created_at)) AS y,
          MONTH(COALESCE(paid_at, created_at)) AS m,
          COUNT(*) AS cnt,
          COALESCE(SUM(amount), 0) AS amt
        FROM payments
        WHERE status = 'completed'
          AND (paid_at IS NOT NULL OR created_at IS NOT NULL)
          AND (COALESCE(paid_at, created_at) >= DATE_SUB(NOW(), INTERVAL 12 MONTH))
        GROUP BY YEAR(COALESCE(paid_at, created_at)), MONTH(COALESCE(paid_at, created_at))
        ORDER BY y DESC, m DESC
        LIMIT 12
      `);
      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      paymentsByMonth = (byMonthRows as any[]).map((r: any) => {
        const y = Number(r.y);
        const m = Number(r.m);
        const monthStr = `${y}-${String(m).padStart(2, '0')}`;
        const label = `${monthNames[m - 1]} ${y}`;
        return {
          month: monthStr,
          monthLabel: label,
          count: Number(r.cnt) || 0,
          amount: parseFloat(r.amt) || 0
        };
      });
    } catch {
      // таблица payments может отсутствовать
    }

    // Последние платежи (для блока на странице). LIMIT подставляем числом (recentLimit уже 1–50)
    const limitNum = Math.max(1, recentLimit);
    const [recentRows] = await connection.execute(
      `SELECT 
        p.id, p.amount, p.currency, p.status, p.paid_at, p.created_at, p.external_id,
        u.telegram_username, u.telegram_first_name
      FROM payments p
      LEFT JOIN users u ON p.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      ORDER BY p.created_at DESC
      LIMIT ${limitNum}`
    );

    const recentPayments = (recentRows as any[]).map((row: any) => ({
      id: row.id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      externalId: row.external_id,
      user: {
        telegramUsername: row.telegram_username,
        telegramFirstName: row.telegram_first_name
      }
    }));

    return NextResponse.json({
      payments: {
        total: Number(pRow.total) || 0,
        completed: Number(pRow.completed) || 0,
        pending: Number(pRow.pending) || 0,
        failed: Number(pRow.failed) || 0,
        refunded: Number(pRow.refunded) || 0,
        cancelled: Number(pRow.cancelled) || 0,
        totalAmount: parseFloat(pRow.total_amount) || 0,
        monthAmount: parseFloat(pRow.month_amount) || 0,
        lastMonthAmount: parseFloat(pRow.last_month_amount) || 0
      },
      subscriptions: {
        total: Number(sRow.total) || 0,
        active: Number(sRow.active) || 0,
        expired: Number(sRow.expired) || 0,
        pending: Number(sRow.pending) || 0,
        cancelled: Number(sRow.cancelled) || 0
      },
      users: {
        total: Number(usersTotal) || 0,
        withPaidSubscription: usersWithPaidSubscription
      },
      projectsTotal,
      usersPerTariff,
      paymentsByMonth,
      recentPayments
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  } finally {
    connection.release();
  }
}
