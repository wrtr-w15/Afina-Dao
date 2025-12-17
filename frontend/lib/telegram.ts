const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function setupTelegramWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const webhookUrl = `${WEBHOOK_URL}/api/telegram/webhook`;
    
    // Удаляем старый webhook
    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      { method: 'POST' }
    );
    
    if (!deleteResponse.ok) {
      console.error('❌ Failed to delete old webhook');
      return false;
    }

    // Устанавливаем новый webhook
    const webhookConfig: any = {
      url: webhookUrl,
      allowed_updates: ['callback_query'] // Только callback_query для безопасности
    };
    
    // Добавляем секретный токен если настроен
    if (TELEGRAM_WEBHOOK_SECRET) {
      webhookConfig.secret_token = TELEGRAM_WEBHOOK_SECRET;
    }
    
    const setResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookConfig)
      }
    );

    const setData = await setResponse.json();
    
    if (setData.ok) {
      console.log(`✅ Telegram webhook set to: ${webhookUrl}`);
      
      // Проверяем информацию о webhook
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
      );
      const infoData = await infoResponse.json();
      
      if (infoData.ok) {
        console.log('📡 Webhook info:', {
          url: infoData.result.url,
          pending_update_count: infoData.result.pending_update_count,
          last_error_message: infoData.result.last_error_message || 'none'
        });
      }
      
      return true;
    } else {
      console.error('❌ Failed to set webhook:', setData);
      return false;
    }
  } catch (error) {
    console.error('❌ Error setting up Telegram webhook:', error);
    return false;
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
          ...(replyMarkup && { reply_markup: replyMarkup })
        })
      }
    );

    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Telegram message sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send Telegram message:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
    return false;
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = true) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text,
          show_alert: showAlert
        })
      }
    );

    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Callback query answered');
      return true;
    } else {
      console.error('❌ Failed to answer callback query:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error answering callback query:', error);
    return false;
  }
}

