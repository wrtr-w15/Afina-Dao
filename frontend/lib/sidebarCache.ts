import { Project } from '../types/project';

const CACHE_KEY = 'sidebar_projects';
const CACHE_EXPIRY_KEY = 'sidebar_projects_expiry';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export const getCachedProjects = (): Project[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (!cached || !expiry) return null;
    
    const now = Date.now();
    const cacheTime = parseInt(expiry);
    
    if (now > cacheTime) {
      // Кэш истек
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached projects:', error);
    return null;
  }
};

export const setCachedProjects = (projects: Project[]): void => {
  try {
    const expiry = Date.now() + CACHE_DURATION;
    localStorage.setItem(CACHE_KEY, JSON.stringify(projects));
    localStorage.setItem(CACHE_EXPIRY_KEY, expiry.toString());
  } catch (error) {
    console.error('Error caching projects:', error);
  }
};

export const clearCache = (): void => {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
};

export const invalidateCache = (): void => {
  clearCache();
  // Уведомляем другие компоненты об обновлении кэша
  window.dispatchEvent(new CustomEvent('sidebarCacheInvalidated'));
};
