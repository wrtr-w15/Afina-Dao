import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '@/lib/database';
import { sendTelegramMessage, answerCallbackQuery } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));
    
    // Обрабатываем callback query (нажатие на кнопку)
    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const chatId = body.callback_query.message.chat.id;
      const callbackQueryId = body.callback_query.id;
      
      console.log('Callback data:', callbackData);
      console.log('Chat ID:', chatId);
      
      if (callbackData.startsWith('approve_') || callbackData.startsWith('deny_')) {
        const requestId = callbackData.split('_')[1];
        const approved = callbackData.startsWith('approve_');
        
        // Обновляем статус в базе данных
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
          'UPDATE auth_sessions SET status = ? WHERE id = ?',
          [approved ? 'approved' : 'denied', requestId]
        );
        await connection.end();
        
        console.log(`Confirmation set in DB: ${requestId} - ${approved ? 'approved' : 'denied'}`);
        
        if ((result as any).affectedRows > 0) {
          // Отвечаем на callback query (убирает "loading" в Telegram)
          const message = approved ? '✅ Access approved' : '❌ Access denied';
          await answerCallbackQuery(callbackQueryId, message);
          
          // Отправляем сообщение в чат
          await sendTelegramMessage(chatId, message);
        } else {
          console.log('Request not found:', requestId);
          await answerCallbackQuery(callbackQueryId, '❌ Request not found or expired');
          await sendTelegramMessage(chatId, '❌ Request not found or expired');
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

