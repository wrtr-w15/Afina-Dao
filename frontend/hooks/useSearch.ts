import { useQuery } from 'react-query';
import { api } from '@/lib/api';

interface UseSearchParams {
  query: string;
  language?: string;
  categoryId?: number;
  enabled?: boolean;
}

export function useSearch(params: UseSearchParams) {
  const { query, language, categoryId, enabled = true } = params;
  
  return useQuery(
    ['search', query, language, categoryId],
    async () => {
      const response = await api.get('/search', {
        params: { q: query, language, categoryId },
      });
      return response.data;
    },
    {
      enabled: enabled && query.length > 2,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
}
