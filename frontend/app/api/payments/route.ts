import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

// Безопасный парсинг provider_data (MySQL может вернуть объект или строку)
function parseProviderData(providerData: unknown): Record<string, unknown> | null {
  if (providerData == null) return null;
  if (typeof providerData === 'object' && providerData !== null && !Array.isArray(providerData)) {
    return providerData as Record<string, unknown>;
  }
  if (typeof providerData === 'string') {
    if (providerData === '[object Object]') return {};
    try {
      return JSON.parse(providerData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return null;
}

// GET /api/payments - список платежей (админ)
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');
  const subscriptionId = searchParams.get('subscriptionId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const connection = await getConnection();
  try {
    let whereClause = '1=1';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (userId) {
      whereClause += ' AND p.user_id = ?';
      params.push(userId);
    }

    if (subscriptionId) {
      whereClause += ' AND p.subscription_id = ?';
      params.push(subscriptionId);
    }

    const limitNum = Math.max(1, Math.min(100, limit));
    const offsetNum = Math.max(0, offset);

    const [rows] = await connection.execute(
      `
      SELECT 
        p.*,
        u.telegram_id,
        u.telegram_username,
        u.telegram_first_name,
        u.email,
        pu.promocode_id,
        pc.code as promocode_code,
        pc.discount_type as promocode_discount_type,
        pc.discount_percent as promocode_discount_percent,
        pc.discount_amount as promocode_discount_amount,
        pu.discount_amount as applied_discount_amount
      FROM payments p
      LEFT JOIN users u ON p.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN promocode_usages pu ON p.subscription_id COLLATE utf8mb4_unicode_ci = pu.subscription_id COLLATE utf8mb4_unicode_ci
      LEFT JOIN promocodes pc ON pu.promocode_id COLLATE utf8mb4_unicode_ci = pc.id COLLATE utf8mb4_unicode_ci
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `,
      params
    );

    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM payments p WHERE ${whereClause}
    `, params);

    const total = (countResult as any[])[0].total;

    // Статистика
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        SUM(CASE WHEN status = 'completed' AND MONTH(paid_at) = MONTH(NOW()) AND YEAR(paid_at) = YEAR(NOW()) THEN amount ELSE 0 END) as month_amount
      FROM payments
    `);

    const payments = (rows as any[]).map(row => ({
      id: row.id,
      subscriptionId: row.subscription_id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      paymentMethod: row.payment_method,
      externalId: row.external_id,
      providerData: parseProviderData(row.provider_data),
      errorMessage: row.error_message,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        telegramId: row.telegram_id,
        telegramUsername: row.telegram_username,
        telegramFirstName: row.telegram_first_name,
        email: row.email
      },
      promocode: row.promocode_code ? {
        code: row.promocode_code,
        discountType: row.promocode_discount_type,
        discountPercent: row.promocode_discount_percent,
        discountAmount: row.promocode_discount_amount,
        appliedDiscount: parseFloat(row.applied_discount_amount) || 0
      } : null
    }));

    const statsRow = (stats as any[])[0];

    return NextResponse.json({
      payments,
      stats: {
        total: statsRow.total,
        completed: statsRow.completed,
        pending: statsRow.pending,
        failed: statsRow.failed,
        totalAmount: parseFloat(statsRow.total_amount) || 0,
        monthAmount: parseFloat(statsRow.month_amount) || 0
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  } finally {
    connection.release();
  }
}
