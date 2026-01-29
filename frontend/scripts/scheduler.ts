#!/usr/bin/env npx tsx
// Скрипт для запуска scheduler

import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { startScheduler } from '../lib/scheduler';

async function main() {
  console.log('🕐 Starting subscription scheduler...');
  
  // Интервал в минутах (по умолчанию 60)
  const intervalMinutes = parseInt(process.env.SCHEDULER_INTERVAL_MINUTES || '60');
  
  startScheduler(intervalMinutes * 60 * 1000);
  
  console.log(`✅ Scheduler started with ${intervalMinutes} minute interval`);
  
  // Держим процесс живым
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down scheduler...');
    process.exit(0);
  });
}

main();
