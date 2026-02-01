import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { validatePaymentHistoryToken } from '@/lib/payment-history-tokens';

// GET /api/user/payments?token=xxx - получение истории платежей пользователя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }
    
    const telegramId = validatePaymentHistoryToken(token);
    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    const connection = await getConnection();
    try {
      // Получаем user_id по telegram_id
      const [userRows] = await connection.execute(
        'SELECT id FROM users WHERE telegram_id = ?',
        [telegramId]
      );
      
      if ((userRows as any[]).length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      const userId = (userRows as any[])[0].id;
      
      // Получаем историю платежей
      const [payments] = await connection.execute(
        `SELECT 
          p.*,
          pu.promocode_id,
          pc.code as promocode_code,
          pc.discount_type as promocode_discount_type,
          pu.discount_amount as promocode_discount_amount,
          s.period_months,
          s.status as subscription_status,
          s.end_date as subscription_end_date
         FROM payments p
         LEFT JOIN subscriptions s ON p.subscription_id = s.id
         LEFT JOIN promocode_usages pu ON p.subscription_id = pu.subscription_id
         LEFT JOIN promocodes pc ON pu.promocode_id = pc.id
         WHERE p.user_id = ?
         ORDER BY p.created_at DESC
         LIMIT 50`,
        [userId]
      );
      
      return NextResponse.json({ 
        payments: (payments as any[]).map(p => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          createdAt: p.created_at,
          paidAt: p.paid_at,
          subscription: {
            periodMonths: p.period_months,
            status: p.subscription_status,
            endDate: p.subscription_end_date
          },
          promocode: p.promocode_code ? {
            code: p.promocode_code,
            discountType: p.promocode_discount_type,
            discountAmount: p.promocode_discount_amount
          } : null
        }))
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
