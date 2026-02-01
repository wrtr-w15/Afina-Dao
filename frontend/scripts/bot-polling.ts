#!/usr/bin/env npx tsx
/**
 * Telegram Bot — режим polling для локальной разработки.
 * Получает обновления от Telegram и пересылает их на локальный API.
 * Запуск: npm run bot (или вместе с проектом: npm run dev:all)
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(scriptDir, '../.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_SUBSCRIPTION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const LOCAL_API = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
const WEBHOOK_ENDPOINT = `${LOCAL_API}/api/telegram/bot`;

let offset = 0;
let isRunning = true;

async function getMe() {
  const res = await fetch(`${API_URL}/getMe`);
  return res.json();
}

async function deleteWebhook() {
  const res = await fetch(`${API_URL}/deleteWebhook`, { method: 'POST' });
  return res.json();
}

async function getUpdates() {
  const res = await fetch(
    `${API_URL}/getUpdates?offset=${offset}&timeout=25&allowed_updates=["message","callback_query"]`
  );
  return res.json();
}

async function forwardToLocal(update: unknown) {
  try {
    const res = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) console.error('Forward error:', res.status);
  } catch (e) {
    console.error('Forward error:', e);
  }
}

async function poll() {
  while (isRunning) {
    try {
      const data = await getUpdates();
      if (!data.ok || !data.result?.length) continue;
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.message?.text) {
          console.log(`📩 @${update.message.from?.username || update.message.from?.id}: ${update.message.text}`);
        } else if (update.callback_query?.data) {
          console.log(`🔘 @${update.callback_query.from?.username || update.callback_query.from?.id}: ${update.callback_query.data}`);
        }
        await forwardToLocal(update);
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') console.error('Poll error:', (e as Error)?.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function waitForServer(url: string, maxAttempts = 30) {
  const base = url.replace(/\/api\/telegram\/bot$/, '');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(base + '/api/telegram/bot?action=info', { signal: AbortSignal.timeout(3000) });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.warn('⚠️ Сервер не ответил за 60 сек, бот запускается anyway.');
}

async function main() {
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_SUBSCRIPTION_BOT_TOKEN не задан в .env.local');
    process.exit(1);
  }

  console.log('🤖 Запуск Telegram бота (polling)...\n');
  console.log('Ожидание готовности сервера...');
  await waitForServer(WEBHOOK_ENDPOINT);

  const me = await getMe();
  if (!me.ok) {
    console.error('❌ Бот недоступен:', me);
    process.exit(1);
  }
  console.log(`✅ Бот: @${me.result.username} (${me.result.first_name})`);

  const del = await deleteWebhook();
  if (del.ok) console.log('✅ Webhook сброшен (включён polling)');

  console.log(`📡 Обновления → ${WEBHOOK_ENDPOINT}`);
  console.log('\n🟢 Бот запущен. Нажмите Ctrl+C для остановки.\n');
  console.log('─'.repeat(50));

  process.on('SIGINT', () => {
    isRunning = false;
    process.exit(0);
  });

  await poll();
}

main().catch(console.error);
