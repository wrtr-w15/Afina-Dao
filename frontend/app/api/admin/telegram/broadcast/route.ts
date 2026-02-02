import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { checkAdminAuth } from '@/lib/security-middleware';

const SUBSCRIPTION_BOT_TOKEN = process.env.TELEGRAM_SUBSCRIPTION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${SUBSCRIPTION_BOT_TOKEN}`;

// POST /api/admin/telegram/broadcast - массовая рассылка сообщений всем пользователям
export async function POST(request: NextRequest) {
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  try {
    const { text, imageUrl, target = 'all' } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Текст сообщения обязателен' }, { status: 400 });
    }

    if (!SUBSCRIPTION_BOT_TOKEN) {
      return NextResponse.json({ error: 'Telegram bot token не настроен' }, { status: 500 });
    }

    const connection = await getConnection();
    try {
      let query: string;
      let params: any[] = [];

      if (target === 'with_subscription') {
        // Пользователи с активной подпиской
        query = `
          SELECT DISTINCT u.telegram_id 
          FROM users u
          INNER JOIN subscriptions s ON u.id COLLATE utf8mb4_unicode_ci = s.user_id COLLATE utf8mb4_unicode_ci
          WHERE u.telegram_id IS NOT NULL
            AND s.status = 'active' 
            AND s.end_date > NOW()
        `;
      } else if (target === 'without_subscription') {
        // Пользователи без активной подписки
        query = `
          SELECT DISTINCT u.telegram_id 
          FROM users u
          LEFT JOIN subscriptions s ON u.id COLLATE utf8mb4_unicode_ci = s.user_id COLLATE utf8mb4_unicode_ci
            AND s.status = 'active' 
            AND s.end_date > NOW()
          WHERE u.telegram_id IS NOT NULL
            AND s.id IS NULL
        `;
      } else {
        // Все пользователи
        query = 'SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL';
      }

      const [users] = await connection.execute(query, params);

      const telegramIds = (users as any[]).map(u => u.telegram_id).filter(Boolean);
      
      if (telegramIds.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Нет пользователей с Telegram ID',
          sent: 0,
          failed: 0,
          total: 0
        });
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Отправляем сообщения с задержкой между запросами (чтобы не превысить rate limit Telegram API)
      for (const chatId of telegramIds) {
        try {
          let response;
          
          if (imageUrl && imageUrl.trim()) {
            // Отправляем фото с подписью
            response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                photo: imageUrl.trim(),
                caption: text,
                parse_mode: 'HTML'
              })
            });
          } else {
            // Отправляем только текст
            response = await fetch(`${TELEGRAM_API}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
              })
            });
          }

          const result = await response.json();
          
          if (result.ok) {
            sent++;
          } else {
            failed++;
            const errorMsg = result.description || 'Unknown error';
            // Не логируем ошибки для каждого пользователя, только общее количество
            if (errors.length < 5) {
              errors.push(`User ${chatId}: ${errorMsg}`);
            }
          }

          // Задержка между запросами (30 сообщений в секунду - это лимит Telegram)
          await new Promise(resolve => setTimeout(resolve, 35));
        } catch (error: any) {
          failed++;
          if (errors.length < 5) {
            errors.push(`User ${chatId}: ${error.message || 'Network error'}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Рассылка завершена: отправлено ${sent}, ошибок ${failed}`,
        sent,
        failed,
        total: telegramIds.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error broadcasting messages:', error);
    return NextResponse.json({ 
      error: error.message || 'Ошибка при выполнении рассылки' 
    }, { status: 500 });
  }
}
