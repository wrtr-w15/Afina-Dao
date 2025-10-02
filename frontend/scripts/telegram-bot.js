const https = require('https');
const mysql = require('mysql2/promise');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8292215462:AAHjDyhDsDIT7j1J7XgsXDRvwtivaIJPnfQ';
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'afina_dao_wiki'
};

let offset = 0;

async function getUpdates() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function answerCallbackQuery(callbackQueryId, text) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: true
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: text
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function handleCallbackQuery(callbackQuery) {
  const callbackData = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const callbackQueryId = callbackQuery.id;

  console.log('📨 Callback received:', callbackData);

  if (callbackData.startsWith('approve_') || callbackData.startsWith('deny_')) {
    const requestId = callbackData.split('_')[1];
    const approved = callbackData.startsWith('approve_');

    try {
      const connection = await mysql.createConnection(DB_CONFIG);
      const [result] = await connection.execute(
        'UPDATE auth_sessions SET status = ? WHERE id = ?',
        [approved ? 'approved' : 'denied', requestId]
      );
      await connection.end();

      if (result.affectedRows > 0) {
        const message = approved ? '✅ Access approved' : '❌ Access denied';
        await answerCallbackQuery(callbackQueryId, message);
        await sendMessage(chatId, message);
        console.log(`✅ ${message} for request ${requestId}`);
      } else {
        await answerCallbackQuery(callbackQueryId, '❌ Request not found');
        await sendMessage(chatId, '❌ Request not found or expired');
        console.log('❌ Request not found:', requestId);
      }
    } catch (error) {
      console.error('❌ Error handling callback:', error);
      await answerCallbackQuery(callbackQueryId, '❌ Error processing request');
    }
  }
}

async function startPolling() {
  console.log('🤖 Telegram bot started (polling mode)');
  console.log('📡 Waiting for updates...\n');

  while (true) {
    try {
      const data = await getUpdates();
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          
          if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
          }
        }
      }
    } catch (error) {
      console.error('❌ Polling error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start the bot
startPolling().catch(console.error);

