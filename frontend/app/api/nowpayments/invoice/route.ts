import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { nowPayments } from '@/lib/nowpayments';
import crypto from 'crypto';

// POST /api/nowpayments/invoice - создание инвойса для оплаты
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, paymentId, userId, amount, orderId, orderDescription } = body;

    if (!subscriptionId || !paymentId || !userId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const payCurrency = process.env.NOWPAYMENTS_PAY_CURRENCY || 'usdtarb';

    // Создаём инвойс в NOWPayments: сумма в USDT как на сайте, без конвертации в доллар
    const invoice = await nowPayments.createInvoice({
      price_amount: Number(amount),
      price_currency: payCurrency, // Цена в USDT (та же валюта, что и оплата) — сумма 1:1 как на сайте
      pay_currency: payCurrency,
      ipn_callback_url: `${baseUrl}/api/nowpayments/webhook`,
      order_id: orderId || `SUB-${subscriptionId.slice(0, 8)}`,
      order_description: orderDescription || `Afina DAO Subscription`,
      success_url: `${baseUrl}/payment/success?subscription=${subscriptionId}`,
      cancel_url: `${baseUrl}/payment/cancel?subscription=${subscriptionId}`,
    });

    // Сохраняем информацию об инвойсе в базу данных
    const connection = await getConnection();
    try {
      await connection.execute(
        `UPDATE payments 
         SET external_id = ?, 
             provider_data = ?,
             updated_at = NOW() 
         WHERE id = ?`,
        [
          invoice.id.toString(),
          JSON.stringify({
            invoice_id: invoice.id,
            invoice_url: invoice.invoice_url,
            pay_currency: payCurrency,
            created_at: invoice.created_at
          }),
          paymentId
        ]
      );

      // Логируем создание инвойса
      await connection.execute(
        `INSERT INTO subscription_logs (id, user_id, subscription_id, action, details)
         VALUES (?, ?, ?, 'nowpayments_invoice_created', ?)`,
        [
          crypto.randomUUID(),
          userId,
          subscriptionId,
          JSON.stringify({
            invoice_id: invoice.id,
            invoice_url: invoice.invoice_url,
            amount,
            pay_currency: payCurrency
          })
        ]
      );
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceUrl: invoice.invoice_url,
      orderId: invoice.order_id,
    });
  } catch (error) {
    console.error('Error creating NOWPayments invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/nowpayments/invoice?id=xxx - получение статуса инвойса
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json({ error: 'payment_id is required' }, { status: 400 });
    }

    const status = await nowPayments.getPaymentStatus(paymentId);

    return NextResponse.json({
      success: true,
      status: status.payment_status,
      data: status
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}
