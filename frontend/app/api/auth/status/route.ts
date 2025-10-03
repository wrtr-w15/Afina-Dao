import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '@/lib/database';

// GET метод для проверки статуса
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    // Проверяем статус в базе данных
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT status, created_at FROM auth_sessions WHERE id = ?',
      [requestId]
    );
    await connection.end();

    const sessions = rows as any[];
    
    if (sessions.length === 0) {
      return NextResponse.json({ 
        status: 'pending',
        message: 'Waiting for confirmation...'
      });
    }

    const session = sessions[0];

    // Проверяем, не истек ли запрос (5 минут)
    const createdAt = new Date(session.created_at).getTime();
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired' }, { status: 410 });
    }

    if (session.status === 'approved') {
      return NextResponse.json({ 
        success: true,
        message: 'Access approved'
      });
    } else if (session.status === 'denied') {
      return NextResponse.json({ 
        success: false,
        message: 'Access denied'
      });
    } else {
      return NextResponse.json({ 
        status: 'pending',
        message: 'Waiting for confirmation...'
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

