// Типы для работы с проектами

export interface ProjectTranslation {
  locale: string;
  name: string;
  description: string;
  content?: string; // Markdown content for this language
}

export interface ContentTranslation {
  locale: string;
  content: string;
}

// Legacy types - kept for backward compatibility
export interface BlockTranslation {
  locale: string;
  title: string;
  content: string;
  gifCaption?: string;
}

export interface ProjectBlock {
  id: string;
  title: string;
  content: string;
  gifUrl?: string;
  gifCaption?: string;
  links?: ProjectLink[];
  translations?: BlockTranslation[];
}

export interface ProjectLink {
  id: string;
  title: string;
  url: string;
  type: 'website' | 'github' | 'documentation' | 'demo' | 'other';
}

// Parsed section from Markdown ### headers
export interface MarkdownSection {
  id: string;
  title: string;
  content: string;
  level: number;
}

export interface Project {
  id: string;
  name: string;
  sidebarName: string; // Название для отображения в сайдбаре
  description: string;
  content?: string; // Full Markdown content (new approach)
  status: ProjectStatus;
  category: string;
  startDate: string;
  deadline: string;
  budget?: number;
  website?: string;
  telegramPost?: string;
  image?: string;
  blocks?: ProjectBlock[]; // Legacy - kept for backward compatibility
  translations?: ProjectTranslation[];
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
  content?: string; // Full Markdown content
  status: ProjectStatus;
  category: string;
  startDate: string;
  deadline: string;
  budget?: number;
  website?: string;
  telegramPost?: string;
  image?: string;
  blocks?: ProjectBlock[]; // Legacy
  translations?: ProjectTranslation[];
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

// Utility function to parse Markdown content into sections based on ### headers
export function parseMarkdownSections(content: string): MarkdownSection[] {
  if (!content) return [];
  
  const sections: MarkdownSection[] = [];
  const lines = content.split('\n');
  
  let currentSection: MarkdownSection | null = null;
  let contentLines: string[] = [];
  
  for (const line of lines) {
    // Check for ### header (level 3)
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    
    if (headerMatch && headerMatch[1].length === 3) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }
      
      // Start new section
      const title = headerMatch[2].trim();
      currentSection = {
        id: title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, ''),
        title,
        content: '',
        level: 3
      };
      contentLines = [];
    } else {
      contentLines.push(line);
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }
  
  // If no ### sections found, treat entire content as one section
  if (sections.length === 0 && content.trim()) {
    sections.push({
      id: 'content',
      title: 'Содержание',
      content: content.trim(),
      level: 3
    });
  }
  
  return sections;
}
