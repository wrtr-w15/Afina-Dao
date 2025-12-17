/**
 * Безопасные утилиты для шифрования
 * Использует AES-256-GCM с HMAC для проверки целостности
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Генерирует безопасный ключ из секрета
 */
function deriveKey(secret: string, salt?: Buffer): Buffer {
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET must be at least 16 characters long');
  }
  
  // Используем scrypt для безопасной генерации ключа
  if (salt) {
    return crypto.scryptSync(secret, salt, KEY_LENGTH);
  }
  
  // Если соль не предоставлена, используем хеш секрета как соль
  const saltHash = crypto.createHash('sha256').update(secret).digest();
  return crypto.scryptSync(secret, saltHash, KEY_LENGTH);
}

/**
 * Шифрует данные с использованием AES-256-GCM
 * Формат: salt:iv:authTag:encrypted
 */
export function encryptSessionData(data: any, secret: string): string {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(secret, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const dataString = JSON.stringify(data);
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Формат: salt:iv:authTag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt session data');
  }
}

/**
 * Расшифровывает данные с проверкой целостности
 */
export function decryptSessionData(encryptedData: string, secret: string): any {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltHex, ivHex, authTagHex, encryptedHex] = parts;
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = encryptedHex;
    
    const key = deriveKey(secret, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt session data - invalid or tampered data');
  }
}

/**
 * Безопасное сравнение строк (защита от timing attacks)
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  // Используем встроенную функцию Node.js для timing-safe сравнения
  try {
    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8')
    );
  } catch {
    // Fallback для случаев когда длины не совпадают
    return false;
  }
}
