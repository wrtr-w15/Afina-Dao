import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { dbConfig } from '@/lib/database';

// GET /api/auth/test-db - тестирование подключения к БД и таблицы auth_sessions
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful');
    
    // Проверяем существование таблицы
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'auth_sessions'",
      [dbConfig.database]
    );
    
    const tableExists = (tables as any[])[0].count > 0;
    console.log('📊 Table auth_sessions exists:', tableExists);
    
    if (!tableExists) {
      await connection.end();
      return NextResponse.json({ 
        error: 'Table auth_sessions does not exist',
        tableExists: false
      }, { status: 500 });
    }
    
    // Проверяем структуру таблицы
    const [columns] = await connection.execute(
      'DESCRIBE auth_sessions'
    );
    
    // Проверяем последние записи
    const [recentSessions] = await connection.execute(
      'SELECT id, status, created_at, updated_at FROM auth_sessions ORDER BY created_at DESC LIMIT 5'
    );
    
    // Пробуем создать тестовую запись
    const testRequestId = crypto.randomUUID();
    try {
      const [insertResult] = await connection.execute(
        'INSERT INTO auth_sessions (id, ip, user_agent, status) VALUES (?, ?, ?, ?)',
        [testRequestId, '127.0.0.1', 'Test Agent', 'pending']
      );
      
      const affectedRows = (insertResult as any).affectedRows;
      console.log('✅ Test insert successful, affectedRows:', affectedRows);
      
      // Удаляем тестовую запись
      await connection.execute(
        'DELETE FROM auth_sessions WHERE id = ?',
        [testRequestId]
      );
      console.log('✅ Test record deleted');
      
      await connection.end();
      
      return NextResponse.json({
        success: true,
        message: 'Database connection and table are working correctly',
        tableExists: true,
        columns: columns,
        recentSessions: recentSessions,
        testInsert: affectedRows > 0 ? 'success' : 'failed'
      });
    } catch (insertError) {
      await connection.end();
      console.error('❌ Test insert failed:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Test insert failed',
        details: insertError instanceof Error ? insertError.message : 'Unknown error',
        tableExists: true,
        columns: columns
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Database test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

