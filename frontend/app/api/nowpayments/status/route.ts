import { NextRequest, NextResponse } from 'next/server';
import { nowPayments } from '@/lib/nowpayments';

// GET /api/nowpayments/status - проверка статуса API и настроек
export async function GET(request: NextRequest) {
  try {
    // Проверяем наличие API ключа
    if (!process.env.NOWPAYMENTS_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'NOWPAYMENTS_API_KEY not configured'
      }, { status: 500 });
    }

    // Проверяем статус API NOWPayments
    const status = await nowPayments.getStatus();

    // Получаем список доступных валют
    const currencies = await nowPayments.getCurrencies();

    // Проверяем настроенную валюту
    const payCurrency = process.env.NOWPAYMENTS_PAY_CURRENCY || 'usdtarb';
    const isCurrencyAvailable = currencies.currencies.includes(payCurrency);

    // Получаем минимальную сумму для USDT ARB
    let minAmount = null;
    try {
      const min = await nowPayments.getMinimumPaymentAmount('usd', payCurrency);
      minAmount = min.min_amount;
    } catch (e) {
      console.error('Failed to get min amount:', e);
    }

    return NextResponse.json({
      success: true,
      api: {
        status: status.message,
        configured: true
      },
      payment: {
        currency: payCurrency,
        currencyAvailable: isCurrencyAvailable,
        minAmount: minAmount,
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET ? 'configured' : 'not configured',
        webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/nowpayments/webhook`
      },
      availableCurrencies: currencies.currencies.length
    });
  } catch (error) {
    console.error('NOWPayments status check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      configured: !!process.env.NOWPAYMENTS_API_KEY
    }, { status: 500 });
  }
}
