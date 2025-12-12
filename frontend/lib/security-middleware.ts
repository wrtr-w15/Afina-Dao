/**
 * Security middleware для защиты API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkRateLimit, isValidUUID } from './validation';
import crypto from 'crypto';

/**
 * Проверяет rate limit для запроса
 */
export function applyRateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60000
): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const { allowed, remaining } = checkRateLimit(ip, maxRequests, windowMs);
  
  if (!allowed) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
        }
      }
    );
  }
  
  return null; // Разрешаем запрос
}

/**
 * Валидирует UUID параметр
 */
export function validateUUIDParam(id: string, paramName: string = 'id'): NextResponse | null {
  if (!isValidUUID(id)) {
    console.warn(`Invalid UUID provided for ${paramName}: ${id}`);
    return NextResponse.json(
      { error: `Invalid ${paramName} format` },
      { status: 400 }
    );
  }
  
  return null; // UUID валиден
}

/**
 * Проверяет Content-Type для POST/PUT запросов
 */
export function validateContentType(request: NextRequest): NextResponse | null {
  const contentType = request.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    console.warn('Invalid Content-Type:', contentType);
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }
  
  return null;
}

/**
 * Логирует подозрительную активность
 */
export function logSuspiciousActivity(
  request: NextRequest,
  reason: string,
  data?: any
): void {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const url = request.url;
  
  console.warn('🚨 SUSPICIOUS ACTIVITY DETECTED:', {
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
    url,
    reason,
    data
  });
  
  // TODO: В продакшене можно отправлять в систему мониторинга
  // или в базу данных для анализа
}

/**
 * Проверяет размер тела запроса
 */
export async function validateRequestBodySize(
  request: NextRequest,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10 MB по умолчанию
): Promise<NextResponse | null> {
  try {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      console.warn(`Request body too large: ${contentLength} bytes`);
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }
    
    return null;
  } catch (error) {
    console.error('Error validating request body size:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

/**
 * Комплексная защита API endpoint
 */
export async function secureAPIEndpoint(
  request: NextRequest,
  options: {
    checkRateLimit?: boolean;
    maxRequests?: number;
    windowMs?: number;
    validateContentType?: boolean;
    maxBodySize?: number;
  } = {}
): Promise<NextResponse | null> {
  const {
    checkRateLimit: shouldCheckRateLimit = true,
    maxRequests = 100,
    windowMs = 60000,
    validateContentType: shouldValidateContentType = true,
    maxBodySize = 10 * 1024 * 1024
  } = options;
  
  // 1. Rate limiting
  if (shouldCheckRateLimit) {
    const rateLimitResult = applyRateLimit(request, maxRequests, windowMs);
    if (rateLimitResult) return rateLimitResult;
  }
  
  // 2. Content-Type validation для POST/PUT
  if (shouldValidateContentType && (request.method === 'POST' || request.method === 'PUT')) {
    const contentTypeResult = validateContentType(request);
    if (contentTypeResult) return contentTypeResult;
  }
  
  // 3. Body size validation
  if (request.method === 'POST' || request.method === 'PUT') {
    const bodySizeResult = await validateRequestBodySize(request, maxBodySize);
    if (bodySizeResult) return bodySizeResult;
  }
  
  return null; // Все проверки пройдены
}

/**
 * Проверяет аутентификацию администратора
 */
export async function checkAdminAuth(): Promise<NextResponse | null> {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin-session');
    
    if (!adminSession || !adminSession.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Проверяем валидность сессии
    const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
    if (!SESSION_SECRET) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    try {
      const [ivHex, encryptedHex] = adminSession.value.split(':');
      if (!ivHex || !encryptedHex) {
        return NextResponse.json(
          { error: 'Invalid session format' },
          { status: 401 }
        );
      }

      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(SESSION_SECRET.padEnd(32, '0').substring(0, 32));
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const sessionData = JSON.parse(decrypted);
      
      // Проверяем, не истекла ли сессия (24 часа)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - sessionData.timestamp > maxAge) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
      }

      return null; // Аутентификация успешна
    } catch (decryptError) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Оборачивает API handler с защитой
 */
export function withSecurity(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options?: {
    checkRateLimit?: boolean;
    maxRequests?: number;
    windowMs?: number;
    validateContentType?: boolean;
    maxBodySize?: number;
  }
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Применяем security checks
    const securityResult = await secureAPIEndpoint(request, options);
    if (securityResult) return securityResult;
    
    // Вызываем оригинальный handler
    try {
      return await handler(request, ...args);
    } catch (error) {
      console.error('API handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

