import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface UseArticlesParams {
  language?: string;
  categoryId?: number;
}

export function useArticles(params: UseArticlesParams = {}) {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: async () => {
      const response = await api.get('/articles', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
