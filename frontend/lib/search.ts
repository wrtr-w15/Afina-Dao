import { getProjects } from './projects';
import { Project } from '@/types/project';

export interface SearchResult {
  id: string;
  type: 'project' | 'category';
  title: string;
  description?: string;
  category?: string;
  image?: string;
  url: string;
}

export async function searchProjects(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  try {
    console.log('Searching for:', query);
    const projects = await getProjects();
    console.log('Found projects:', projects.length);
    const results: SearchResult[] = [];
    const searchQuery = query.toLowerCase().trim();

    // Поиск по проектам
    projects.forEach(project => {
      if (project.status !== 'active') return;

      const matchesName = project.name.toLowerCase().includes(searchQuery) ||
                        project.sidebarName?.toLowerCase().includes(searchQuery);
      const matchesDescription = project.description?.toLowerCase().includes(searchQuery);
      const matchesCategory = typeof project.category === 'string' 
        ? project.category.toLowerCase().includes(searchQuery)
        : (project.category as any)?.name?.toLowerCase().includes(searchQuery);

      if (matchesName || matchesDescription || matchesCategory) {
        const result = {
          id: project.id,
          type: 'project' as const,
          title: project.sidebarName || project.name,
          description: project.description,
          category: typeof project.category === 'string' 
            ? project.category 
            : (project.category as any)?.name,
          image: project.image,
          url: `/project/${project.id}`
        };
        console.log('Adding search result:', result);
        results.push(result);
      }
    });

    // Сортируем результаты по названию
    const sortedResults = results.sort((a, b) => a.title.localeCompare(b.title));
    console.log('Search results:', sortedResults.length);
    return sortedResults;

  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}
