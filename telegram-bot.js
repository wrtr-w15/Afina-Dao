const https = require('https');

// Конфигурация
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const CHAT_ID = 'YOUR_CHAT_ID_HERE';
const WEBHOOK_URL = 'http://localhost:3000/api/telegram/webhook';

// Функция для отправки сообщения
function sendMessage(chatId, text, replyMarkup = null) {
  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: replyMarkup
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
      console.log('Response:', d.toString());
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(data);
  req.end();
}

// Функция для установки webhook
function setWebhook() {
  const data = JSON.stringify({
    url: WEBHOOK_URL
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/setWebhook`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Webhook Status: ${res.statusCode}`);
    res.on('data', (d) => {
      console.log('Webhook Response:', d.toString());
    });
  });

  req.on('error', (e) => {
    console.error('Webhook Error:', e);
  });

  req.write(data);
  req.end();
}

// Функция для получения информации о боте
function getBotInfo() {
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/getMe`,
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    console.log(`Bot Info Status: ${res.statusCode}`);
    res.on('data', (d) => {
      console.log('Bot Info:', d.toString());
    });
  });

  req.on('error', (e) => {
    console.error('Bot Info Error:', e);
  });

  req.end();
}

// Экспорт функций
module.exports = {
  sendMessage,
  setWebhook,
  getBotInfo
};

// Если запускается напрямую
if (require.main === module) {
  console.log('Setting up Telegram bot...');
  console.log('1. Getting bot info...');
  getBotInfo();
  
  console.log('2. Setting webhook...');
  setWebhook();
  
  console.log('3. Sending test message...');
  sendMessage(CHAT_ID, '🤖 Bot is ready for admin authentication!');
}
