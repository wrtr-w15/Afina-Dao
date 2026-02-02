import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { nowPayments } from '@/lib/nowpayments';
import { handlePaymentSuccess } from '../webhook/route';
import type { IPNPayload } from '@/lib/nowpayments';
import { PaymentStatuses } from '@/lib/nowpayments';

// POST /api/nowpayments/confirm-payment — вручную подтвердить оплату по NOWPayments payment_id
// Тело: { payment_id: "5626591438" } или query: ?payment_id=5626591438
// Защита: ?secret=XXX или body.secret должен совпадать с NOWPAYMENTS_CONFIRM_SECRET (если задан)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { payment_id?: string; paymentId?: string; secret?: string };
    const confirmSecret = process.env.NOWPAYMENTS_CONFIRM_SECRET;
    if (confirmSecret) {
      const urlSecret = request.nextUrl.searchParams.get('secret');
      if (urlSecret !== confirmSecret && body.secret !== confirmSecret) {
        return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 });
      }
    }

    const paymentId = (body.payment_id ?? body.paymentId ?? request.nextUrl.searchParams.get('payment_id'))?.toString();
    if (!paymentId) {
      return NextResponse.json({ error: 'payment_id required' }, { status: 400 });
    }

    const status = await nowPayments.getPaymentStatus(paymentId);
    const statusLower = (status.payment_status || '').toLowerCase();
    if (statusLower !== PaymentStatuses.FINISHED) {
      return NextResponse.json(
        { error: 'Payment not finished', payment_status: status.payment_status },
        { status: 400 }
      );
    }

    const connection = await getConnection();
    try {
      const orderId = status.order_id || '';
      const invoiceId = status.invoice_id != null ? String(status.invoice_id) : '';
      
      console.log('[NOWPayments confirm-payment] Looking for payment:', { paymentId, invoiceId, orderId });
      
      // Поиск по invoice_id (мы храним его в external_id и provider_data.invoice_id)
      const [byInvoiceRows] = await connection.execute(
        `SELECT p.*, s.user_id, s.id as sub_id, s.period_months, 
                u.discord_id, u.email, u.google_drive_email, u.telegram_id,
                u.telegram_username, u.telegram_first_name
         FROM payments p 
         LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci
         LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
         WHERE p.external_id = ? OR JSON_UNQUOTE(JSON_EXTRACT(p.provider_data, '$.invoice_id')) = ?`,
        [invoiceId, invoiceId]
      );
      let payments = byInvoiceRows as any[];
      
      if (payments.length > 0) {
        console.log('[NOWPayments confirm-payment] Found by invoice_id:', invoiceId);
      }

      // Поиск по order_id
      if (payments.length === 0 && orderId) {
        const [byOrderRows] = await connection.execute(
          `SELECT p.*, s.user_id, s.id as sub_id, s.period_months, 
                  u.discord_id, u.email, u.google_drive_email, u.telegram_id,
                  u.telegram_username, u.telegram_first_name
           FROM payments p 
           LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci
           LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
           WHERE JSON_UNQUOTE(JSON_EXTRACT(p.provider_data, '$.order_id')) = ?`,
          [orderId]
        );
        payments = byOrderRows as any[];
        if (payments.length > 0) {
          console.log('[NOWPayments confirm-payment] Found by order_id:', orderId);
        }
      }
      
      // Поиск по payment_id (на случай если он уже был сохранён)
      if (payments.length === 0) {
        const [byPaymentRows] = await connection.execute(
          `SELECT p.*, s.user_id, s.id as sub_id, s.period_months, 
                  u.discord_id, u.email, u.google_drive_email, u.telegram_id,
                  u.telegram_username, u.telegram_first_name
           FROM payments p 
           LEFT JOIN subscriptions s ON p.subscription_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci
           LEFT JOIN users u ON s.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
           WHERE p.external_id = ? OR JSON_UNQUOTE(JSON_EXTRACT(p.provider_data, '$.payment_id')) = ?`,
          [paymentId, paymentId]
        );
        payments = byPaymentRows as any[];
        if (payments.length > 0) {
          console.log('[NOWPayments confirm-payment] Found by payment_id:', paymentId);
        }
      }

      if (payments.length === 0) {
        console.warn('[NOWPayments confirm-payment] Payment not found:', { paymentId, invoiceId, orderId });
        return NextResponse.json(
          { error: 'Payment not found in DB', order_id: orderId, invoice_id: invoiceId, payment_id: paymentId },
          { status: 404 }
        );
      }

      const payment = payments[0];
      const ipnLike: IPNPayload = {
        payment_id: status.payment_id,
        invoice_id: status.invoice_id,
        payment_status: PaymentStatuses.FINISHED,
        pay_address: status.pay_address || '',
        payin_extra_id: status.payin_extra_id || null,
        price_amount: status.price_amount || 0,
        price_currency: status.price_currency || '',
        pay_amount: status.pay_amount || 0,
        actually_paid: status.actually_paid ?? 0,
        pay_currency: status.pay_currency || 'usdt',
        order_id: status.order_id || '',
        order_description: status.order_description || '',
        purchase_id: String(status.purchase_id ?? ''),
        outcome_amount: status.outcome_amount ?? 0,
        outcome_currency: status.outcome_currency || '',
      };

      await handlePaymentSuccess(connection, payment, ipnLike);
      return NextResponse.json({ success: true, message: 'Payment confirmed and subscription activated' });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('[NOWPayments confirm-payment] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}

// GET /api/nowpayments/confirm-payment?payment_id=5626591438&secret=XXX
export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get('payment_id');
  if (!paymentId) {
    return NextResponse.json({ error: 'payment_id required' }, { status: 400 });
  }
  const confirmSecret = process.env.NOWPAYMENTS_CONFIRM_SECRET;
  if (confirmSecret && request.nextUrl.searchParams.get('secret') !== confirmSecret) {
    return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 });
  }
  const secret = request.nextUrl.searchParams.get('secret');
  const body = secret ? { payment_id: paymentId, secret } : { payment_id: paymentId };
  return POST(new NextRequest(request.url, { method: 'POST', body: JSON.stringify(body) }));
}
