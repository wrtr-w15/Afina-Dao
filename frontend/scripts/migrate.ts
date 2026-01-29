#!/usr/bin/env npx tsx
// Скрипт для запуска миграций базы данных

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';

// Загружаем .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  console.log('🗃️  Running database migrations...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'afina_dao_wiki',
    multipleStatements: true
  });

  try {
    // Читаем файл миграции
    const migrationPath = path.resolve(__dirname, '../database/migrations/create_subscription_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Разделяем на statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.execute(statement);
        console.log(`  ✓ Statement ${i + 1} executed`);
      } catch (error: any) {
        if (error.errno === 1050) {
          console.log(`  ○ Statement ${i + 1} skipped (table already exists)`);
        } else {
          console.error(`  ✗ Statement ${i + 1} failed:`, error.message);
        }
      }
    }

    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
