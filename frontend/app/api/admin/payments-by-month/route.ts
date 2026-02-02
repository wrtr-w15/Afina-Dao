import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

// GET /api/admin/payments-by-month?month=YYYY-MM — список завершённых оплат за выбранный месяц
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Query month=YYYY-MM required' }, { status: 400 });
  }

  const [year, monthNum] = month.split('-').map(Number);
  const dateFrom = `${year}-${String(monthNum).padStart(2, '0')}-01 00:00:00`;
  const dateTo = monthNum === 12
    ? `${year + 1}-01-01 00:00:00`
    : `${year}-${String(monthNum + 1).padStart(2, '0')}-01 00:00:00`;

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT 
        p.id, p.amount, p.currency, p.paid_at, p.created_at,
        u.telegram_username, u.telegram_first_name
      FROM payments p
      LEFT JOIN users u ON p.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      WHERE p.status = 'completed'
        AND (COALESCE(p.paid_at, p.created_at) >= ? AND COALESCE(p.paid_at, p.created_at) < ?)
      ORDER BY COALESCE(p.paid_at, p.created_at) DESC`,
      [dateFrom, dateTo]
    );

    const payments = (rows as any[]).map((row: any) => ({
      id: row.id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      user: {
        telegramUsername: row.telegram_username,
        telegramFirstName: row.telegram_first_name
      }
    }));

    return NextResponse.json({ month, payments });
  } catch (error) {
    console.error('Error fetching payments by month:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  } finally {
    connection.release();
  }
}
