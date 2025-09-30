import { useQuery } from 'react-query';
import { api } from '@/lib/api';

export function useArticle(slug: string, language?: string) {
  return useQuery(
    ['article', slug, language],
    async () => {
      const response = await api.get(`/articles/slug/${slug}`, {
        params: { language },
      });
      return response.data;
    },
    {
      enabled: !!slug,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}
