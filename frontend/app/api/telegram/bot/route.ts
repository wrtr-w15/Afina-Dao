import { NextRequest, NextResponse } from 'next/server';
import { processUpdate, setWebhook, getMe } from '@/lib/telegram-bot';
import { preloadAllTexts } from '@/lib/telegram-bot/get-text';
import { applyRateLimit } from '@/lib/security-middleware';

/** Лимит запросов на webhook бота в минуту (на IP) — выдерживает нагрузку и защищает от флуда */
const BOT_WEBHOOK_RATE_LIMIT = 120;
const BOT_WEBHOOK_WINDOW_MS = 60 * 1000;
/** Максимальный размер тела update от Telegram (обычно < 10 KB) */
const BOT_WEBHOOK_BODY_MAX_BYTES = 512 * 1024;

// Предзагрузка текстов при первом запросе
let textsPreloaded = false;

// POST /api/telegram/bot - webhook для Telegram
export async function POST(request: NextRequest) {
  try {
    // Rate limit: защита от флуда и DoS (выдерживает до 2 req/s на IP)
    const rateLimitResult = applyRateLimit(request, BOT_WEBHOOK_RATE_LIMIT, BOT_WEBHOOK_WINDOW_MS);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Ограничение размера тела (Telegram update обычно маленький)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > BOT_WEBHOOK_BODY_MAX_BYTES) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }

    // Предзагружаем тексты при первом запросе
    if (!textsPreloaded) {
      preloadAllTexts().catch(console.error);
      textsPreloaded = true;
    }

    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && webhookSecret && webhookSecret.length > 10 && secretToken !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const update = await request.json();
    // Обрабатываем асинхронно, не блокируя ответ
    processUpdate(update).catch((error) => {
      console.error('[Telegram Bot] Error processing update:', error);
    });
    
    // Сразу отвечаем Telegram, чтобы избежать таймаутов
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET /api/telegram/bot - информация и настройка (setup/info/webhook только для админа)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const customUrl = searchParams.get('url');

  if (action === 'setup' || action === 'info' || action === 'webhook') {
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;
  }

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
