import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getConnection } from '@/lib/database';
import { sendTelegramMessageToAll, getTelegramChatIds } from '@/lib/telegram';
import { encryptSessionData, decryptSessionData, constantTimeCompare } from '@/lib/crypto-utils';
import { applyRateLimit, ADMIN_SESSION_MAX_AGE_SEC, logSuspiciousActivity } from '@/lib/security-middleware';
import {
  RATE_LIMIT_AUTH_ATTEMPTS,
  RATE_LIMIT_AUTH_WINDOW_MS,
  RATE_LIMIT_AUTH_POLL_ATTEMPTS,
  RATE_LIMIT_AUTH_POLL_WINDOW_MS,
  AUTH_BODY_MAX_BYTES,
  AUTH_PASSWORD_MAX_LENGTH,
} from '@/lib/security-config';
import { insertAdminLoginLog } from '@/lib/admin-login-log';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const IS_DEV_MODE = process.env.NODE_ENV === 'development';

// POST /api/auth - создание запроса на логин
export async function POST(request: NextRequest) {
  try {
    // CSRF: в production отклоняем запросы с неверным Origin (OWASP A01)
    if (process.env.NODE_ENV === 'production') {
      const origin = request.headers.get('origin');
      if (origin) {
        try {
          const reqUrl = new URL(request.url);
          const originUrl = new URL(origin);
          if (originUrl.origin !== reqUrl.origin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // Brute force: лимит попыток входа на IP
    const rateLimitResult = applyRateLimit(request, RATE_LIMIT_AUTH_ATTEMPTS, RATE_LIMIT_AUTH_WINDOW_MS);
    if (rateLimitResult) {
      logSuspiciousActivity(request, 'auth_rate_limit_exceeded', { path: '/api/auth POST' });
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      getConnection().then((conn) => {
        insertAdminLoginLog(conn, { ip, userAgent: request.headers.get('user-agent') || undefined, event: 'failure', details: 'rate_limit' })
          .finally(() => conn.release());
      }).catch(() => {});
      return rateLimitResult;
    }

    // Ограничение размера тела (OWASP A05)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > AUTH_BODY_MAX_BYTES) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
    }

    const body = await request.json().catch(() => ({}));
    // Используем только ожидаемое поле (защита от mass assignment / prototype pollution — OWASP A08)
    const password =
      typeof body === 'object' && body !== null && typeof (body as { password?: unknown }).password === 'string'
        ? String((body as { password: string }).password).slice(0, AUTH_PASSWORD_MAX_LENGTH)
        : '';

    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Защита от timing attacks (OWASP A07)
    if (!constantTimeCompare(password, ADMIN_PASSWORD)) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || undefined;
      logSuspiciousActivity(request, 'auth_failed', { ip: ip.substring(0, 20) + '…' });
      getConnection().then((conn) => {
        insertAdminLoginLog(conn, { ip, userAgent, event: 'failure', details: 'invalid_password' })
          .finally(() => conn.release());
      }).catch(() => {});
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Получаем информацию о пользователе
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // DEV MODE: Skip Telegram confirmation in development
    if (IS_DEV_MODE) {
      console.log('🔧 DEV MODE: Skipping Telegram confirmation');
      
      // Create session directly
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionData = {
        token: sessionToken,
        timestamp: Date.now(),
        ip: ip,
        userAgent: userAgent
      };

      if (!SESSION_SECRET) {
        console.error('SESSION_SECRET not configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      
      const encryptedData = encryptSessionData(sessionData, SESSION_SECRET);
      
      const cookieStore = await cookies();
      cookieStore.set('admin-session', encryptedData, {
        httpOnly: true,
        secure: false, // Dev mode
        sameSite: 'strict',
        maxAge: ADMIN_SESSION_MAX_AGE_SEC
      });

      getConnection().then((conn) => {
        insertAdminLoginLog(conn, { ip, userAgent, event: 'success', details: 'dev_mode' })
          .finally(() => conn.release());
      }).catch(() => {});

      return NextResponse.json({ 
        success: true, 
        devMode: true,
        message: 'DEV MODE: Logged in without Telegram confirmation'
      });
    }
    
    // Генерируем уникальный ID для запроса
    const requestId = crypto.randomUUID();
    
    // Сохраняем запрос в базу данных
    const connection = await getConnection();
    try {
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
        return NextResponse.json({ error: 'Failed to create login request' }, { status: 500 });
      }
    } catch (dbError) {
      console.error('❌ Database error creating auth session:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    } finally {
      connection.release();
    }

    // Отправляем сообщение в Telegram
    try {
      await sendLoginRequestToTelegram(requestId, ip, userAgent);
      console.log('✅ Telegram message sent for request:', requestId);
    } catch (telegramError) {
      console.error('❌ Error sending Telegram message:', telegramError);
      // Не прерываем процесс, так как запрос уже создан в БД
    }

    try {
      await insertAdminLoginLog(connection, { ip, userAgent, event: 'success', details: 'request_created' });
    } catch (_) {}

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
  // Rate limit polling (защита от перебора requestId и DoS)
  const pollRateLimit = applyRateLimit(request, RATE_LIMIT_AUTH_POLL_ATTEMPTS, RATE_LIMIT_AUTH_POLL_WINDOW_MS);
  if (pollRateLimit) {
    return pollRateLimit;
  }

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
  }

  // Валидация requestId (UUID) — защита от injection
  if (requestId.length > 64 || /[^\w\-]/.test(requestId)) {
    return NextResponse.json({ error: 'Invalid request ID' }, { status: 400 });
  }

  // Получаем статус из базы данных
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM auth_sessions WHERE id = ?',
      [requestId]
    );

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
        maxAge: ADMIN_SESSION_MAX_AGE_SEC
      });

      try {
        await insertAdminLoginLog(connection, {
          ip: session.ip || 'unknown',
          userAgent: session.user_agent || undefined,
          event: 'success',
          details: 'telegram_approved'
        });
      } catch (_) {}

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
  } finally {
    connection.release();
  }
}

async function sendLoginRequestToTelegram(requestId: string, ip: string, userAgent: string) {
  const chatIds = getTelegramChatIds();
  
  if (chatIds.length === 0) {
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

    // Отправляем на все указанные chat ID
    await sendTelegramMessageToAll(message, replyMarkup);
  } catch (error) {
    console.error('Error sending login request to Telegram:', error);
  }
}

/** Проверка, что IP не внутренний (защита от SSRF: не дергаем внешний API с подставленным IP). */
function isPrivateOrInternalIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  const trimmed = ip.split(',')[0].trim(); // x-forwarded-for может быть "client, proxy1, proxy2"
  if (trimmed === '::1' || trimmed === '127.0.0.1') return true;
  // IPv4 private / loopback / link-local
  if (/^10\./.test(trimmed) || /^172\.(1[6-9]|2\d|3[01])\./.test(trimmed) || /^192\.168\./.test(trimmed)) return true;
  if (/^127\./.test(trimmed) || /^169\.254\./.test(trimmed)) return true;
  // IPv6 loopback / link-local
  if (/^fe80:/i.test(trimmed) || /^::1$/.test(trimmed) || /^fc00:/i.test(trimmed) || /^fd/i.test(trimmed)) return true;
  // Подозрительные значения (не похожи на публичный IPv4)
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed) && !/^[0-9a-f:]+$/i.test(trimmed)) return true;
  return false;
}

async function getLocationByIP(ip: string): Promise<string> {
  try {
    if (isPrivateOrInternalIP(ip)) {
      return 'Local/Unknown';
    }
    const safeIp = encodeURIComponent(ip.split(',')[0].trim());
    const response = await fetch(`http://ip-api.com/json/${safeIp}`, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const data = await response.json();
      return `${data.city || 'Unknown'}, ${data.country || 'Unknown'}`;
    }
    return 'Unknown location';
  } catch (error) {
    return 'Unknown location';
  }
}
