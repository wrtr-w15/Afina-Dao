// Утилиты для работы с аутентификацией админки

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

export const ADMIN_TOKEN = 'admin_authenticated';

// Проверка аутентификации на клиенте
export const isAdminAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('admin_token');
  return token === ADMIN_TOKEN;
};

// Получение текущего пользователя
export const getCurrentAdmin = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem('admin_user');
};

// Выход из системы
export const logoutAdmin = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
};

// Установка токена в cookies (для middleware)
export const setAdminTokenInCookies = (token: string): void => {
  if (typeof document === 'undefined') return;
  
  document.cookie = `admin_token=${token}; path=/; max-age=86400; SameSite=Strict`;
};

// Удаление токена из cookies
export const removeAdminTokenFromCookies = (): void => {
  if (typeof document === 'undefined') return;
  
  document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
};
