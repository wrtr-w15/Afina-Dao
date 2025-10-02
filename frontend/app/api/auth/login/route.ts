import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

// Хранилище ожидающих подтверждения запросов
const pendingRequests = new Map<string, {
  timestamp: number;
  ip: string;
  userAgent: string;
  location?: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Получаем информацию о пользователе
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Генерируем уникальный ID для запроса
    const requestId = crypto.randomUUID();
    
    // Сохраняем запрос в ожидании подтверждения
    pendingRequests.set(requestId, {
      timestamp: Date.now(),
      ip,
      userAgent,
    });

    // Отправляем сообщение в Telegram
    await sendTelegramMessage(requestId, ip, userAgent);

    return NextResponse.json({ 
      success: true, 
      requestId,
      message: 'Please check your Telegram for confirmation'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendTelegramMessage(requestId: string, ip: string, userAgent: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram bot not configured');
    return;
  }

  try {
    // Получаем геолокацию по IP (упрощенная версия)
    const location = await getLocationByIP(ip);
    
    const message = `
🔐 *Admin Login Request*

*Request ID:* \`${requestId}\`
*IP Address:* \`${ip}\`
*Location:* ${location}
*User Agent:* \`${userAgent}\`
*Time:* ${new Date().toLocaleString()}

Click to approve: /approve_${requestId}
Click to deny: /deny_${requestId}
    `.trim();

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve_${requestId}` },
              { text: '❌ Deny', callback_data: `deny_${requestId}` }
            ]
          ]
        }
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Telegram message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

async function getLocationByIP(ip: string): Promise<string> {
  try {
    // Используем бесплатный API для получения геолокации
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return `${data.city}, ${data.regionName}, ${data.country}`;
    }
    return 'Unknown location';
  } catch (error) {
    console.error('Error getting location:', error);
    return 'Unknown location';
  }
}

// API для проверки статуса запроса
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
  }

  const pendingRequest = pendingRequests.get(requestId);
  
  if (!pendingRequest) {
    return NextResponse.json({ error: 'Request not found or expired' }, { status: 404 });
  }

  // Проверяем, не истек ли запрос (5 минут)
  if (Date.now() - pendingRequest.timestamp > 5 * 60 * 1000) {
    pendingRequests.delete(requestId);
    return NextResponse.json({ error: 'Request expired' }, { status: 410 });
  }

  return NextResponse.json({ 
    status: 'pending',
    timestamp: pendingRequest.timestamp 
  });
}
