// Типы для работы с категориями

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  color: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: string;
}

// Предустановленные цвета для категорий
export const CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const;

// Предустановленные иконки для категорий
export const CATEGORY_ICONS = [
  'TrendingUp',
  'Image',
  'Gamepad2',
  'Users',
  'Server',
  'Wrench',
  'MoreHorizontal',
  'Code',
  'Database',
  'Shield',
  'Zap',
  'Globe',
  'Smartphone',
  'Monitor',
  'Laptop',
  'Cpu',
  'HardDrive',
  'Wifi',
  'Lock',
  'Key',
  'Settings',
  'BarChart3',
  'PieChart',
  'Activity',
  'Target',
  'Rocket',
  'Star',
  'Heart',
  'Bookmark',
  'Tag'
] as const;

export type CategoryColor = typeof CATEGORY_COLORS[number];
export type CategoryIcon = typeof CATEGORY_ICONS[number];
