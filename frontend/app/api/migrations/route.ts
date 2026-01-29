import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import fs from 'fs';
import path from 'path';

// POST /api/migrations - запустить миграции
export async function POST(request: NextRequest) {
  // Проверка аутентификации администратора
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const connection = await getConnection();
  const results: { file: string; status: string; error?: string }[] = [];

  try {
    // Читаем файл миграции
    const migrationPath = path.join(process.cwd(), 'database/migrations/create_subscription_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found',
        path: migrationPath 
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Разделяем на отдельные statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        results.push({ file: 'create_subscription_system.sql', status: 'success' });
      } catch (error: any) {
        // Игнорируем ошибки "table already exists"
        if (error.errno === 1050) {
          results.push({ file: 'create_subscription_system.sql', status: 'skipped (already exists)' });
        } else {
          results.push({ 
            file: 'create_subscription_system.sql', 
            status: 'error',
            error: error.message 
          });
        }
      }
    }

    return NextResponse.json({ 
      message: 'Migrations completed',
      results 
    });
  } catch (error) {
    console.error('Error running migrations:', error);
    return NextResponse.json({ 
      error: 'Failed to run migrations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    connection.release();
  }
}

// GET /api/migrations - проверить статус таблиц
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const connection = await getConnection();

  try {
    const tables = ['users', 'subscriptions', 'payments', 'user_bot_states', 'subscription_logs'];
    const status: { table: string; exists: boolean; rowCount?: number }[] = [];

    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        status.push({ 
          table, 
          exists: true, 
          rowCount: (rows as any)[0].count 
        });
      } catch (error: any) {
        if (error.errno === 1146) {
          status.push({ table, exists: false });
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({ tables: status });
  } catch (error) {
    console.error('Error checking migrations:', error);
    return NextResponse.json({ 
      error: 'Failed to check migrations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    connection.release();
  }
}
