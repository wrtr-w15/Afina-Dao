import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Проверяем, если это админская страница (кроме /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Получаем токен из cookies
    const adminToken = request.cookies.get('admin_token')?.value;
    
    // Если токена нет, перенаправляем на страницу входа
    if (!adminToken || adminToken !== 'admin_authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  // Если пользователь уже авторизован и пытается зайти на /admin/login, перенаправляем на /admin
  if (pathname === '/admin/login') {
    const adminToken = request.cookies.get('admin_token')?.value;
    if (adminToken === 'admin_authenticated') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*'
  ],
};
