/**
 * Утилиты для валидации и санитизации входных данных
 * Защита от SQL-инъекций, XSS и других атак
 */

/**
 * Проверяет, является ли строка валидным UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Проверяет, является ли строка валидным URL
 * Только безопасные протоколы: http, https
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:'];
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Проверяет, является ли строка валидным email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Санитизирует строку, удаляя потенциально опасные символы для SQL
 * ВАЖНО: Это НЕ заменяет использование параметризованных запросов!
 * Используйте это только как дополнительный слой защиты
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Удаляем нулевые байты
  return input.replace(/\0/g, '');
}

/**
 * Валидирует и санитизирует имя проекта
 */
export function validateProjectName(name: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Project name is required' };
  }
  
  const sanitized = sanitizeString(name.trim());
  
  if (sanitized.length === 0) {
    return { valid: false, error: 'Project name cannot be empty' };
  }
  
  if (sanitized.length > 255) {
    return { valid: false, error: 'Project name is too long (max 255 characters)' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Валидирует статус проекта
 */
export function validateProjectStatus(status: string): { valid: boolean; error?: string } {
  const validStatuses = ['active', 'draft', 'inactive'];
  
  if (!status || !validStatuses.includes(status)) {
    return { valid: false, error: 'Invalid project status. Must be: active, draft, or inactive' };
  }
  
  return { valid: true };
}

/**
 * Валидирует locale
 */
export function validateLocale(locale: string): { valid: boolean; error?: string } {
  const validLocales = ['ru', 'en', 'ua'];
  
  if (!locale || !validLocales.includes(locale)) {
    return { valid: false, error: 'Invalid locale. Must be: ru, en, or ua' };
  }
  
  return { valid: true };
}

/**
 * Валидирует описание (может содержать Markdown)
 */
export function validateDescription(description: string): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be a string' };
  }
  
  const sanitized = sanitizeString(description.trim());
  
  if (sanitized.length > 10000) {
    return { valid: false, error: 'Description is too long (max 10000 characters)' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Валидирует URL изображения
 * Проверяет безопасность протокола
 */
export function validateImageURL(url: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: true, sanitized: null as any }; // URL опционален
  }
  
  const sanitized = sanitizeString(url.trim());
  
  if (sanitized.length > 2048) {
    return { valid: false, error: 'Image URL is too long (max 2048 characters)' };
  }
  
  // Проверяем, что это похоже на URL
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://') && !sanitized.startsWith('/')) {
    return { valid: false, error: 'Image URL must start with http://, https://, or /' };
  }
  
  // Дополнительная проверка для полных URL
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    if (!isValidURL(sanitized)) {
      return { valid: false, error: 'Invalid or unsafe URL protocol' };
    }
  }
  
  return { valid: true, sanitized };
}

/**
 * Валидирует ссылку проекта
 */
export function validateProjectLink(url: string, type: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Link URL is required' };
  }
  
  const sanitized = sanitizeString(url.trim());
  
  if (sanitized.length === 0) {
    return { valid: false, error: 'Link URL cannot be empty' };
  }
  
  if (sanitized.length > 2048) {
    return { valid: false, error: 'Link URL is too long (max 2048 characters)' };
  }
  
  // Проверяем тип ссылки
  const validLinkTypes = ['website', 'telegram', 'github', 'twitter', 'discord'];
  if (!validLinkTypes.includes(type)) {
    return { valid: false, error: 'Invalid link type' };
  }
  
  return { valid: true };
}

/**
 * Валидирует данные перевода проекта
 */
export function validateProjectTranslation(translation: any): { valid: boolean; error?: string } {
  if (!translation || typeof translation !== 'object') {
    return { valid: false, error: 'Translation must be an object' };
  }
  
  const localeValidation = validateLocale(translation.locale);
  if (!localeValidation.valid) {
    return localeValidation;
  }
  
  const nameValidation = validateProjectName(translation.name);
  if (!nameValidation.valid) {
    return nameValidation;
  }
  
  const descriptionValidation = validateDescription(translation.description);
  if (!descriptionValidation.valid) {
    return descriptionValidation;
  }
  
  return { valid: true };
}

/**
 * Валидирует данные блока контента
 */
export function validateContentBlock(block: any): { valid: boolean; error?: string } {
  if (!block || typeof block !== 'object') {
    return { valid: false, error: 'Block must be an object' };
  }
  
  // Проверяем GIF URL если есть
  if (block.gifUrl) {
    const gifValidation = validateImageURL(block.gifUrl);
    if (!gifValidation.valid) {
      return { valid: false, error: `Block GIF: ${gifValidation.error}` };
    }
  }
  
  // Проверяем переводы
  if (block.translations && Array.isArray(block.translations)) {
    for (const translation of block.translations) {
      const localeValidation = validateLocale(translation.locale);
      if (!localeValidation.valid) {
        return { valid: false, error: `Block translation: ${localeValidation.error}` };
      }
      
      const titleValidation = validateProjectName(translation.title);
      if (!titleValidation.valid) {
        return { valid: false, error: `Block title: ${titleValidation.error}` };
      }
      
      const contentValidation = validateDescription(translation.content);
      if (!contentValidation.valid) {
        return { valid: false, error: `Block content: ${contentValidation.error}` };
      }
    }
  }
  
  // Проверяем ссылки
  if (block.links && Array.isArray(block.links)) {
    for (const link of block.links) {
      const linkValidation = validateProjectLink(link.url, link.type);
      if (!linkValidation.valid) {
        return { valid: false, error: `Block link: ${linkValidation.error}` };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Экранирует HTML спецсимволы для предотвращения XSS
 */
export function escapeHTML(text: string): string {
  if (typeof text !== 'string') return '';
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Валидирует данные категории
 */
export function validateCategory(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Category data must be an object' };
  }
  
  if (data.name) {
    const nameValidation = validateProjectName(data.name);
    if (!nameValidation.valid) {
      return nameValidation;
    }
  }
  
  if (data.description) {
    const descValidation = validateDescription(data.description);
    if (!descValidation.valid) {
      return descValidation;
    }
  }
  
  // Валидация цвета (hex color)
  if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
    return { valid: false, error: 'Color must be a valid hex color (e.g., #FF5733)' };
  }
  
  return { valid: true };
}

/**
 * Ограничение скорости запросов (простая реализация в памяти)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000 // 1 минута
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    // Создаем новую запись или сбрасываем старую
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Очистка старых записей rate limit (вызывать периодически)
 */
export function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Автоматическая очистка каждые 5 минут
if (typeof window === 'undefined') { // Только на сервере
  setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
}

