import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN = '/admin/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathNormalized = pathname.replace(/\/$/, '') || '/';

  // API админки и пользователей (OWASP A01 Broken Access Control) — требуют сессию
  if (pathNormalized.startsWith('/api/users') || pathNormalized.startsWith('/api/admin')) {
    const authToken = request.cookies.get('admin-session');
    if (!authToken?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Доступ без авторизации только на страницу логина
  if (pathNormalized === ADMIN_LOGIN) {
    return NextResponse.next();
  }

  // Все остальные /admin/* требуют валидной сессии
  const authToken = request.cookies.get('admin-session');
  if (!authToken?.value) {
    const loginUrl = new URL(ADMIN_LOGIN, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/users',
    '/api/users/:path*',
    '/api/admin',
    '/api/admin/:path*',
  ],
};