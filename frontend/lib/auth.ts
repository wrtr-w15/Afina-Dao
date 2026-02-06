// Утилиты для работы с аутентификацией админки
// Реальная аутентификация — по httpOnly cookie admin-session (проверяется middleware и API).

/** Флаг сессии на клиенте (только для UI). Доступ к /admin защищён middleware по cookie. */
const ADMIN_SESSION_KEY = 'admin_session_ok';

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
}

/** Вызывать после успешного входа (редирект на /admin уже означает успех). */
export function setAdminSessionFlag(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
}

export function getCurrentAdmin(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_user') ?? null;
}

/** Выход: сбрасывает сессию на сервере и редиректит на логин. */
export async function logoutAdmin(redirectTo = '/admin/login'): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem('admin_user');
    window.location.href = redirectTo;
  }
}

/** @deprecated Используйте logoutAdmin() — cookie admin-session сбрасывается через API. */
export function removeAdminTokenFromCookies(): void {
  // Ничего не делаем: реальная сессия — admin-session, очищается в logoutAdmin через /api/auth/logout
}
