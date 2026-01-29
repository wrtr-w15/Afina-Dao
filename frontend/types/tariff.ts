// Типы для системы тарифов

export interface TariffFeature {
  id: string;
  name: string;
  included: boolean;
}

// Ценовая опция внутри тарифа (период + цена за месяц)
export interface TariffPrice {
  id: string;
  tariffId: string;
  periodMonths: number;      // Количество месяцев
  monthlyPrice: number;      // Цена за месяц в USDT
  isPopular?: boolean;       // Отметка "популярный"
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTariffPriceData {
  periodMonths: number;
  monthlyPrice: number;
  isPopular?: boolean;
  sortOrder?: number;
}

export interface Tariff {
  id: string;
  name: string;
  description?: string;
  features?: TariffFeature[];
  isActive: boolean;
  isArchived: boolean;
  isCustom: boolean;
  customForUserId?: string;
  sortOrder: number;
  color?: string;
  badge?: string;
  createdAt: string;
  updatedAt: string;
  // Ценовые опции тарифа
  prices?: TariffPrice[];
}

export interface CreateTariffData {
  name: string;
  description?: string;
  features?: TariffFeature[];
  isActive?: boolean;
  isCustom?: boolean;
  customForUserId?: string;
  sortOrder?: number;
  color?: string;
  badge?: string;
  // Ценовые опции при создании
  prices?: CreateTariffPriceData[];
}

export interface UpdateTariffData {
  name?: string;
  description?: string;
  features?: TariffFeature[];
  isActive?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
  color?: string;
  badge?: string;
  // Обновление ценовых опций
  prices?: CreateTariffPriceData[];
}

export type TariffChangeType = 'created' | 'updated' | 'archived' | 'activated' | 'deactivated';

export interface TariffHistory {
  id: string;
  tariffId: string;
  changedBy?: string;
  changeType: TariffChangeType;
  oldValues?: Partial<Tariff>;
  newValues?: Partial<Tariff>;
  createdAt: string;
}

export interface UserAvailableTariff {
  id: string;
  userId: string;
  tariffId: string;
  grantedBy?: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  // Joined data
  tariff?: Tariff;
}

export interface TariffStats {
  total: number;
  active: number;
  archived: number;
  custom: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: number; // в USDT
}

// Утилита для форматирования срока тарифа
export function formatTariffDuration(days: number): string {
  if (days === 30 || days === 31) return '1 месяц';
  if (days >= 28 && days <= 31) return '1 месяц';
  if (days >= 59 && days <= 62) return '2 месяца';
  if (days >= 89 && days <= 93) return '3 месяца';
  if (days >= 179 && days <= 186) return '6 месяцев';
  if (days >= 365 && days <= 366) return '1 год';
  if (days >= 730 && days <= 732) return '2 года';
  
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    if (remainingDays === 0) {
      if (years === 1) return '1 год';
      if (years < 5) return `${years} года`;
      return `${years} лет`;
    }
  }
  
  if (days >= 30) {
    const months = Math.floor(days / 30);
    if (months === 1) return '1 месяц';
    if (months < 5) return `${months} месяца`;
    return `${months} месяцев`;
  }
  
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  return `${days} дней`;
}

// Утилита для форматирования цены в USDT
export function formatUSDT(amount: number): string {
  return `${amount.toFixed(2)} USDT`;
}

// Цвета для тарифов
export const TARIFF_COLORS = [
  { id: 'indigo', name: 'Indigo', class: 'from-indigo-500 to-purple-600' },
  { id: 'emerald', name: 'Emerald', class: 'from-emerald-500 to-teal-600' },
  { id: 'amber', name: 'Amber', class: 'from-amber-500 to-orange-600' },
  { id: 'rose', name: 'Rose', class: 'from-rose-500 to-pink-600' },
  { id: 'blue', name: 'Blue', class: 'from-blue-500 to-cyan-600' },
  { id: 'violet', name: 'Violet', class: 'from-violet-500 to-purple-600' },
] as const;

export type TariffColorId = typeof TARIFF_COLORS[number]['id'];

export function getTariffColorClass(colorId?: string): string {
  const color = TARIFF_COLORS.find(c => c.id === colorId);
  return color?.class || TARIFF_COLORS[0].class;
}
