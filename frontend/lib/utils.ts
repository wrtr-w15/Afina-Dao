import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Добавляет к дате ровно N календарных месяцев.
 * Пример: 31 января + 1 месяц = 28/29 февраля (последний день месяца), а не 2–3 марта.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) {
    result.setDate(0); // последний день текущего месяца
  }
  return result;
}
