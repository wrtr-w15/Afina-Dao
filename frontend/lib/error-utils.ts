/**
 * Преобразует любое значение ошибки в безопасное сообщение для пользователя.
 * Избегает "[object Event]" и других бесполезных строк из браузерных/React ошибок.
 */
const FALLBACK_MESSAGE = 'Произошла ошибка';

export function normalizeErrorMessage(error: unknown): string {
  if (error == null) return FALLBACK_MESSAGE;
  
  // Check for Event objects first
  if (typeof error === 'object' && error !== null) {
    const constructorName = (error as { constructor?: { name?: string } }).constructor?.name;
    const str = String(error);
    
    // Check if it's an Event object
    if (
      constructorName === 'Event' || 
      constructorName === 'SyntheticEvent' ||
      constructorName === 'AbortError' ||
      str === '[object Event]' ||
      (error instanceof Event) ||
      ((error as any).type && (error as any).target !== undefined)
    ) {
      return FALLBACK_MESSAGE;
    }
  }
  
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed || trimmed === '[object Event]') return FALLBACK_MESSAGE;
    return trimmed;
  }
  
  if (error instanceof Error) {
    const msg = error.message?.trim();
    if (!msg || msg === '[object Event]') return FALLBACK_MESSAGE;
    return msg;
  }
  
  // Other objects
  if (typeof error === 'object') {
    const msg = (error as { message?: string }).message;
    if (typeof msg === 'string') {
      const trimmed = msg.trim();
      if (trimmed && trimmed !== '[object Event]') return trimmed;
    }
    const str = String(error);
    if (str === '[object Object]' || str === '[object Event]') return FALLBACK_MESSAGE;
    if (str.length > 2 && str.length < 500) return str;
  }
  
  return FALLBACK_MESSAGE;
}
