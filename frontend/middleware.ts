import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Проверяем, является ли это страницей админки
  if (pathname.startsWith('/admin')) {
    // Исключаем страницу логина
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }
    
    // Проверяем наличие auth cookie
    const authToken = request.cookies.get('admin-session');
    
    if (!authToken) {
      // Если нет токена - редиректим на логин
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  // Применяем middleware ко всем страницам админки
  matcher: ['/admin/:path*', '/((?!_next/static|_next/image|favicon.ico|api).*)']
};