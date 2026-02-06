import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/security-middleware';

// API для очистки кэша (только для авторизованных админов)
export async function POST(request: NextRequest) {
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  return NextResponse.json({
    message: 'Cache invalidation signal sent',
    timestamp: new Date().toISOString()
  });
}

export async function GET(request: NextRequest) {
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  return NextResponse.json({
    message: 'Use POST to invalidate cache',
    timestamp: new Date().toISOString()
  });
}

