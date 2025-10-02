import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Пропускаем все запросы без изменений
  return NextResponse.next();
}

export const config = {
  // Не применяем middleware к статическим файлам и API
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};