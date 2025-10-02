import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Хранилище ожидающих подтверждения запросов
const pendingRequests = new Map<string, {
  timestamp: number;
  ip: string;
  userAgent: string;
  location?: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Обрабатываем callback query (нажатие на кнопку)
    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const chatId = body.callback_query.message.chat.id;
      
      if (callbackData.startsWith('approve_') || callbackData.startsWith('deny_')) {
        const requestId = callbackData.split('_')[1];
        const approved = callbackData.startsWith('approve_');
        
        const pendingRequest = pendingRequests.get(requestId);
        
        if (pendingRequest) {
          // Отправляем подтверждение в основное приложение
          await sendConfirmationToApp(requestId, approved);
          
          // Отвечаем пользователю в Telegram
          const message = approved ? '✅ Access approved' : '❌ Access denied';
          await sendTelegramMessage(chatId, message);
          
          // Удаляем запрос из ожидания
          pendingRequests.delete(requestId);
        } else {
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

// Глобальное хранилище для подтверждений
// Глобальное хранилище для подтверждений (внутри этого файла)
const globalConfirmations = new Map<string, {
  timestamp: number;
  approved: boolean;
}>();

async function sendConfirmationToApp(requestId: string, approved: boolean) {
  try {
    // Устанавливаем статус напрямую
    globalConfirmations.set(requestId, {
      timestamp: Date.now(),
      approved
    });
    console.log(`Confirmation set: ${requestId} - ${approved ? 'approved' : 'denied'}`);
  } catch (error) {
    console.error('Error setting confirmation status:', error);
  }
}

// Экспортируем функцию для использования в других API
export function getGlobalConfirmation(requestId: string) {
  return globalConfirmations.get(requestId);
}

export function deleteGlobalConfirmation(requestId: string) {
  globalConfirmations.delete(requestId);
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Telegram bot token not configured');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Telegram message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}
