import { NextRequest, NextResponse } from 'next/server';
import { processUpdate, setWebhook, getMe } from '@/lib/telegram-bot';

// POST /api/telegram/bot - webhook для Telegram
export async function POST(request: NextRequest) {
  try {
    // В dev режиме пропускаем проверку секрета для polling
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev && webhookSecret && webhookSecret.length > 10 && secretToken !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const update = await request.json();
    processUpdate(update).catch(console.error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET /api/telegram/bot - информация и настройка
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const customUrl = searchParams.get('url');

  try {
    if (action === 'setup') {
      let baseUrl = customUrl || process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl) {
        return NextResponse.json({ error: 'Set NEXT_PUBLIC_BASE_URL or use ?url=YOUR_URL' }, { status: 400 });
      }
      baseUrl = baseUrl.replace(/\/$/, '');
      const webhookUrl = `${baseUrl}/api/telegram/bot`;
      const result = await setWebhook(webhookUrl);
      return NextResponse.json({ webhookUrl, result });
    }

    if (action === 'info') {
      return NextResponse.json(await getMe());
    }

    if (action === 'webhook') {
      const token = process.env.TELEGRAM_SUBSCRIPTION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      return NextResponse.json(await res.json());
    }

    return NextResponse.json({
      bot: '@afinadao_pay_bot',
      commands: ['/start', '/account', '/status', '/help'],
      actions: ['setup', 'info', 'webhook']
    });
  } catch (error) {
    console.error('Telegram bot GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
