import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { dbConfig } from '@/lib/database';
import { sendTelegramMessage } from '@/lib/telegram';
import { encryptSessionData, decryptSessionData, constantTimeCompare } from '@/lib/crypto-utils';
import { applyRateLimit } from '@/lib/security-middleware';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

// POST /api/auth - создание запроса на логин
export async function POST(request: NextRequest) {
  try {
    // Rate limiting для защиты от brute force (5 попыток в 15 минут)
    const rateLimitResult = applyRateLimit(request, 5, 15 * 60 * 1000);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    
    const { password } = await request.json();
    
    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Защита от timing attacks
    if (!constantTimeCompare(password || '', ADMIN_PASSWORD)) {
      // Логируем попытку без чувствительных данных
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      console.warn('Failed login attempt from IP:', ip);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Получаем информацию о пользователе
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Генерируем уникальный ID для запроса
    const requestId = crypto.randomUUID();
    
    // Сохраняем запрос в базу данных
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      const [result] = await connection.execute(
        'INSERT INTO auth_sessions (id, ip, user_agent, status) VALUES (?, ?, ?, ?)',
        [requestId, ip, userAgent, 'pending']
      );
      
      const affectedRows = (result as any).affectedRows;
      console.log('✅ Login request created in DB:', { 
        requestId, 
        ip: ip.substring(0, 10) + '...', 
        userAgent: userAgent.substring(0, 50),
        affectedRows 
      });
      
      if (affectedRows === 0) {
        console.error('❌ Failed to insert auth session into database - affectedRows is 0');
        await connection.end();
        return NextResponse.json({ error: 'Failed to create login request' }, { status: 500 });
      }
      
      await connection.end();
    } catch (dbError) {
      console.error('❌ Database error creating auth session:', dbError);
      if (connection) {
        await connection.end().catch(() => {});
      }
      return NextResponse.json({ 
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Отправляем сообщение в Telegram
    try {
      await sendLoginRequestToTelegram(requestId, ip, userAgent);
      console.log('✅ Telegram message sent for request:', requestId);
    } catch (telegramError) {
      console.error('❌ Error sending Telegram message:', telegramError);
      // Не прерываем процесс, так как запрос уже создан в БД
    }

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

// GET /api/auth?requestId=xxx - проверка статуса и создание сессии
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    // Получаем статус из базы данных
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM auth_sessions WHERE id = ?',
      [requestId]
    );
    await connection.end();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ 
        status: 'expired',
        error: 'Request not found or expired',
        success: false
      }, { status: 410 });
    }

    const session = rows[0] as any;

    // Проверяем, не истек ли запрос (5 минут)
    const createdAt = new Date(session.created_at).getTime();
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      return NextResponse.json({ 
        status: 'expired',
        error: 'Request not found or expired',
        success: false
      }, { status: 410 });
    }

    if (session.status === 'approved') {
      // Создаем сессию и устанавливаем cookie
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionData = {
        token: sessionToken,
        timestamp: Date.now(),
        ip: session.ip,
        userAgent: session.user_agent
      };

      // Шифруем данные сессии с использованием безопасного метода
      if (!SESSION_SECRET) {
        console.error('SESSION_SECRET not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      
      const encryptedData = encryptSessionData(sessionData, SESSION_SECRET);

      // Устанавливаем cookie
      const cookieStore = await cookies();
      cookieStore.set('admin-session', encryptedData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24 часа
      });

      return NextResponse.json({ 
        success: true,
        message: 'Login successful'
      });
    } else if (session.status === 'denied') {
      return NextResponse.json({ 
        success: false,
        message: 'Access denied'
      });
    } else {
      return NextResponse.json({ 
        status: 'pending',
        message: 'Waiting for confirmation...'
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendLoginRequestToTelegram(requestId: string, ip: string, userAgent: string) {
  if (!TELEGRAM_CHAT_ID) {
    console.error('Telegram chat ID not configured');
    return;
  }

  try {
    const location = await getLocationByIP(ip);
    
    const message = `
🔐 *Admin Login Request*

*Request ID:* \`${requestId}\`
*IP Address:* \`${ip}\`
*Location:* ${location}
*User Agent:* \`${userAgent}\`
*Time:* ${new Date().toLocaleString()}
    `.trim();

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve_${requestId}` },
          { text: '❌ Deny', callback_data: `deny_${requestId}` }
        ]
      ]
    };

    await sendTelegramMessage(TELEGRAM_CHAT_ID, message, replyMarkup);
  } catch (error) {
    console.error('Error sending login request to Telegram:', error);
  }
}

async function getLocationByIP(ip: string): Promise<string> {
  try {
    if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
      return 'Local/Unknown';
    }
    
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    if (response.ok) {
      const data = await response.json();
      return `${data.city || 'Unknown'}, ${data.country || 'Unknown'}`;
    }
    return 'Unknown location';
  } catch (error) {
    return 'Unknown location';
  }
}
