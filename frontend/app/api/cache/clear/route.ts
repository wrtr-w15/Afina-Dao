import { NextResponse } from 'next/server';

// Простой API endpoint для очистки кэша на клиенте
export async function POST() {
  return NextResponse.json({ 
    message: 'Cache invalidation signal sent',
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to invalidate cache',
    timestamp: new Date().toISOString()
  });
}

