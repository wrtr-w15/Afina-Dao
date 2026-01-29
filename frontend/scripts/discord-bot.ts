#!/usr/bin/env npx tsx
// Скрипт для запуска Discord бота

import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { connectDiscordBot, registerCommands } from '../lib/discord-bot';

async function main() {
  console.log('🤖 Starting Discord bot...');
  
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN is not set');
    process.exit(1);
  }

  try {
    // Регистрируем команды
    await registerCommands();
    
    // Подключаем бота
    await connectDiscordBot();
    
    console.log('✅ Discord bot is running');
    
    // Держим процесс живым
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down Discord bot...');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start Discord bot:', error);
    process.exit(1);
  }
}

main();
