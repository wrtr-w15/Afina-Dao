// Типы для работы с проектами

export interface ProjectBlock {
  id: string;
  title: string;
  content: string; // Markdown content
  gifUrl?: string;
  gifCaption?: string; // Подпись под GIF
  links?: ProjectLink[];
}

export interface ProjectLink {
  id: string;
  title: string;
  url: string;
  type: 'website' | 'github' | 'documentation' | 'demo' | 'other';
}

export interface Project {
  id: string;
  name: string;
  sidebarName: string; // Название для отображения в сайдбаре
  description: string;
  status: ProjectStatus;
  category: string;
  startDate: string;
  deadline: string;
  budget?: number;
  website?: string;
  telegramPost?: string;
  image?: string;
  blocks: ProjectBlock[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 
  | 'active'       // Активен
  | 'draft'        // Черновик
  | 'inactive';    // Не активен

export type ProjectCategory = 
  | 'defi'         // DeFi
  | 'nft'          // NFT
  | 'gaming'       // Игры
  | 'dao'          // DAO
  | 'infrastructure' // Инфраструктура
  | 'tools'        // Инструменты
  | 'other';       // Другое

export type OSCompatibility = 
  | 'windows'      // Windows
  | 'macos';       // macOS

export interface CreateProjectData {
  name: string;
  sidebarName: string;
  description: string;
  status: ProjectStatus;
  category: string;
  startDate: string;
  deadline: string;
  budget?: number;
  website?: string;
  telegramPost?: string;
  image?: string;
  blocks: ProjectBlock[];
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

// Статусы проектов с переводами
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Активен',
  draft: 'Черновик',
  inactive: 'Не активен'
};

// Категории проектов с переводами
export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  defi: 'DeFi',
  nft: 'NFT',
  gaming: 'Игры',
  dao: 'DAO',
  infrastructure: 'Инфраструктура',
  tools: 'Инструменты',
  other: 'Другое'
};

// Цвета для статусов
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'text-green-600 bg-green-100 dark:bg-green-900/20',
  draft: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
  inactive: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
};

// Цвета для категорий
export const PROJECT_CATEGORY_COLORS: Record<ProjectCategory, string> = {
  defi: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  nft: 'text-pink-600 bg-pink-100 dark:bg-pink-900/20',
  gaming: 'text-green-600 bg-green-100 dark:bg-green-900/20',
  dao: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
  infrastructure: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20',
  tools: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20',
  other: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
};

// Совместимость ОС с переводами
export const OS_COMPATIBILITY_LABELS: Record<OSCompatibility, string> = {
  windows: 'Windows',
  macos: 'macOS'
};

// Иконки для совместимости ОС
export const OS_COMPATIBILITY_ICONS: Record<OSCompatibility, string> = {
  windows: '🪟',
  macos: '🍎'
};

// Цвета для совместимости ОС
export const OS_COMPATIBILITY_COLORS: Record<OSCompatibility, string> = {
  windows: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  macos: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
};
