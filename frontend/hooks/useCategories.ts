import { useQuery } from 'react-query';
import { api } from '@/lib/api';

export function useCategories() {
  return useQuery(
    'categories',
    async () => {
      const response = await api.get('/categories');
      return response.data;
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}
