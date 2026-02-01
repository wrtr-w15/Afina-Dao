// API для работы с проектами в MySQL базе данных

import { Project, CreateProjectData, UpdateProjectData, ProjectStatus, ProjectCategory } from '../types/project';

// Базовый URL для API
const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

// Вспомогательная функция для обработки ошибок API
async function handleApiResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: Record<string, unknown> = {};

    const text = await response.text();
    if (text) {
      try {
        const error = JSON.parse(text) as Record<string, unknown>;
        errorDetails = error;
        const msg = error.error ?? error.message ?? error.details;
        if (msg != null && String(msg).trim()) {
          errorMessage = String(msg);
        }
      } catch {
        if (text.length < 200) {
          errorDetails = { body: text };
        }
      }
    }

    console.error('API Error:', response.status, response.statusText, response.url, errorMessage, errorDetails);

    throw new Error(errorMessage);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Получить все проекты
export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`);
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
};

// Получить проект по ID
export const getProjectById = async (id: string): Promise<Project | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${id}`);
    if (response.status === 404) {
      return null;
    }
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error loading project:', error);
    return null;
  }
};

// Функция для глубокой очистки объектов от циклических ссылок
const deepCleanObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.map(item => deepCleanObject(item));
  }
  
  const cleaned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'function') continue; // Пропускаем функции
      if (Array.isArray(value)) {
        cleaned[key] = value.map(item => deepCleanObject(item));
      } else if (value && typeof value === 'object' && value.constructor === Object) {
        cleaned[key] = deepCleanObject(value);
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};

// Создать новый проект
export const createProject = async (data: CreateProjectData): Promise<Project> => {
  try {
    // Создаем чистый объект без циклических ссылок
    const cleanData = deepCleanObject({
      name: data.name,
      sidebarName: data.sidebarName,
      description: data.description,
      content: data.content || '',
      status: typeof data.status === 'string' ? data.status : 'draft',
      category: data.category,
      startDate: data.startDate,
      deadline: data.deadline,
      budget: data.budget,
      website: data.website,
      telegramPost: data.telegramPost,
      image: data.image,
      blocks: data.blocks || [],
      translations: data.translations || []
    });

    // Отладочная информация
    console.log('Original data:', data);
    console.log('Clean data:', cleanData);
    
    // Проверяем, что cleanData не содержит циклических ссылок
    try {
      JSON.stringify(cleanData);
      console.log('✅ cleanData is serializable');
    } catch (jsonError) {
      console.error('❌ cleanData contains circular references:', jsonError);
      throw new Error('Data contains circular references');
    }

    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanData),
    });
    
    const result = await handleApiResponse(response);
    
    // Очищаем кэш сайдбара
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sidebar_projects');
      window.dispatchEvent(new Event('sidebarCacheInvalidated'));
    }
    
    // Возвращаем созданный проект
    return await getProjectById(result.id) || data as any;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

// Обновить проект
export const updateProject = async (id: string, data: any): Promise<Project | null> => {
  try {
    // Создаем чистый объект без циклических ссылок
    const cleanData = {
      sidebarName: data.sidebarName,
      status: data.status,
      category: data.category,
      website: data.website,
      telegramPost: data.telegramPost,
      image: data.image,
      content: data.content,
      translations: data.translations
    };

    const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanData),
    });

    await handleApiResponse(response);

    // Очищаем кэш сайдбара
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sidebar_projects');
      window.dispatchEvent(new Event('sidebarCacheInvalidated'));
    }

    // Успех — не вызываем getProjectById, чтобы не падать из-за возможной ошибки GET
    return null;
  } catch (error) {
    console.error('Error updating project:', error);
    return null;
  }
};

// Удалить проект
export const deleteProject = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
      method: 'DELETE',
    });
    
    await handleApiResponse(response);
    
    // Очищаем кэш сайдбара
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sidebar_projects');
      window.dispatchEvent(new Event('sidebarCacheInvalidated'));
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
};

// Получить проекты по статусу
export const getProjectsByStatus = async (status: ProjectStatus): Promise<Project[]> => {
  const projects = await getProjects();
  return projects.filter(project => project.status === status);
};

// Получить проекты по категории
export const getProjectsByCategory = async (category: ProjectCategory): Promise<Project[]> => {
  const projects = await getProjects();
  return projects.filter(project => project.category === category);
};

// Поиск проектов
export const searchProjects = async (query: string): Promise<Project[]> => {
  const projects = await getProjects();
  const lowercaseQuery = query.toLowerCase();
  
  return projects.filter(project => 
    project.name.toLowerCase().includes(lowercaseQuery) ||
    project.description.toLowerCase().includes(lowercaseQuery) ||
    project.sidebarName.toLowerCase().includes(lowercaseQuery)
  );
};

// Получить статистику проектов
export const getProjectsStats = async () => {
  const projects = await getProjects();
  
  return {
    total: projects.length,
    byStatus: {
      active: projects.filter(p => p.status === 'active').length,
      draft: projects.filter(p => p.status === 'draft').length,
      inactive: projects.filter(p => p.status === 'inactive').length
    },
    byCategory: {
      defi: projects.filter(p => p.category === 'defi').length,
      nft: projects.filter(p => p.category === 'nft').length,
      gaming: projects.filter(p => p.category === 'gaming').length,
      dao: projects.filter(p => p.category === 'dao').length,
      infrastructure: projects.filter(p => p.category === 'infrastructure').length,
      tools: projects.filter(p => p.category === 'tools').length,
      other: projects.filter(p => p.category === 'other').length
    },
    averageProgress: 0
  };
};