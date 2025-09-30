import { useMutation, useQueryClient } from 'react-query';
import { api } from '@/lib/api';

export function useArticleLike() {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (articleId: number) => {
      const response = await api.post(`/articles/${articleId}/like`);
      return response.data;
    },
    {
      onSuccess: (data, articleId) => {
        // Invalidate and refetch articles
        queryClient.invalidateQueries(['articles']);
        queryClient.invalidateQueries(['article', articleId]);
      },
    }
  );
}
