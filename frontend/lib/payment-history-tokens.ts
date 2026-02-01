import crypto from 'crypto';

// Временные токены для доступа к истории платежей (хранятся в памяти, TTL 5 минут)
const accessTokens = new Map<string, { telegramId: number; expires: number }>();

// Генерация токена доступа
export function generatePaymentHistoryToken(telegramId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 5 * 60 * 1000; // 5 минут
  accessTokens.set(token, { telegramId, expires });
  
  // Очистка истекших токенов
  setTimeout(() => {
    accessTokens.delete(token);
  }, 5 * 60 * 1000);
  
  return token;
}

// Проверка токена
export function validatePaymentHistoryToken(token: string): number | null {
  const tokenData = accessTokens.get(token);
  if (!tokenData || tokenData.expires < Date.now()) {
    accessTokens.delete(token);
    return null;
  }
  return tokenData.telegramId;
}
