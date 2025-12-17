import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '@/lib/database';
import { sendTelegramMessage, answerCallbackQuery } from '@/lib/telegram';
import { applyRateLimit } from '@/lib/security-middleware';
import crypto from 'crypto';

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting для webhook (строгий - 10 запросов в минуту)
    const rateLimitResult = applyRateLimit(request, 10, 60000);
    if (rateLimitResult) {
      console.warn('Rate limit exceeded for webhook');
      return rateLimitResult;
    }
    
    // Проверка секретного токена (если настроен)
    if (TELEGRAM_WEBHOOK_SECRET) {
      const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (!secretToken || secretToken !== TELEGRAM_WEBHOOK_SECRET) {
        console.error('Invalid webhook secret token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const body = await request.json();
    
    // Логируем только необходимую информацию без чувствительных данных
    console.log('📥 Webhook received:', {
      hasCallbackQuery: !!body.callback_query,
      callbackDataPrefix: body.callback_query?.data?.substring(0, 20) || 'none',
      messageId: body.callback_query?.message?.message_id || 'none'
    });
    
    // Обрабатываем callback query (нажатие на кнопку)
    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const chatId = body.callback_query.message.chat.id;
      const callbackQueryId = body.callback_query.id;
      
      // Логируем без чувствительных данных
      console.log('Callback query:', {
        dataPrefix: callbackData?.substring(0, 20),
        chatId: chatId ? '***' : 'none',
        queryId: callbackQueryId ? '***' : 'none'
      });
      
      if (callbackData.startsWith('approve_') || callbackData.startsWith('deny_')) {
        // Извлекаем requestId (UUID после префикса)
        const requestId = callbackData.substring(callbackData.indexOf('_') + 1);
        const approved = callbackData.startsWith('approve_');
        
        // Валидация UUID формата (36 символов с дефисами)
        if (!requestId || requestId.length !== 36 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
          console.error('Invalid requestId format:', requestId);
          await answerCallbackQuery(callbackQueryId, '❌ Invalid request ID');
          return NextResponse.json({ ok: true });
        }
        
        // Обновляем статус в базе данных
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
          'UPDATE auth_sessions SET status = ? WHERE id = ?',
          [approved ? 'approved' : 'denied', requestId]
        );
        await connection.end();
        
        const affectedRows = (result as any).affectedRows;
        console.log(`📝 Confirmation set in DB: ${requestId} - ${approved ? 'approved' : 'denied'} (affected rows: ${affectedRows})`);
        
        if (affectedRows > 0) {
          // Отвечаем на callback query (убирает "loading" в Telegram)
          const message = approved ? '✅ Access approved' : '❌ Access denied';
          await answerCallbackQuery(callbackQueryId, message);
          
          // Отправляем сообщение в чат
          await sendTelegramMessage(chatId, message);
          console.log(`✅ Successfully processed ${approved ? 'approval' : 'denial'} for request ${requestId}`);
        } else {
          console.warn(`⚠️ Request not found in DB: ${requestId}`);
          await answerCallbackQuery(callbackQueryId, '❌ Request not found or expired');
          await sendTelegramMessage(chatId, '❌ Request not found or expired');
        }
      }
    }

    // Если нет callback_query, логируем для отладки (без чувствительных данных)
    if (!body.callback_query) {
      console.log('⚠️ Webhook received but no callback_query found. Body type:', body.message ? 'message' : 'other');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Telegram webhook error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

