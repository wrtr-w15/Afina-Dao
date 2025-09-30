// API для работы с проектами в MySQL базе данных

import { Project, CreateProjectData, UpdateProjectData, ProjectStatus, ProjectCategory } from '../types/project';

// Базовый URL для API
const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

// Вспомогательная функция для обработки ошибок API
async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
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

// Создать новый проект
export const createProject = async (data: CreateProjectData): Promise<Project> => {
  try {
    // Очистка данных от циклических ссылок
    const cleanData = {
      ...data,
      blocks: data.blocks?.map(block => ({
        id: block.id,
        title: block.title,
        content: block.content,
        gifUrl: block.gifUrl,
        links: block.links?.map(link => ({
          id: link.id,
          title: link.title,
          url: link.url,
          type: link.type
        })) || []
      })) || []
    };

    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanData),
    });
    
    const result = await handleApiResponse(response);
    
    // Возвращаем созданный проект
    return await getProjectById(result.id) || data as any;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

// Обновить проект
export const updateProject = async (data: UpdateProjectData): Promise<Project | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    await handleApiResponse(response);
    
    // Возвращаем обновленный проект
    return await getProjectById(data.id);
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
      planning: projects.filter(p => p.status === 'planning').length,
      development: projects.filter(p => p.status === 'development').length,
      testing: projects.filter(p => p.status === 'testing').length,
      completed: projects.filter(p => p.status === 'completed').length,
      'on-hold': projects.filter(p => p.status === 'on-hold').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length
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
    averageProgress: projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0
  };
};