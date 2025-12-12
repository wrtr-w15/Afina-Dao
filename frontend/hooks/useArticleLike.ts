import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useArticleLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (articleId: number) => {
      const response = await api.post(`/articles/${articleId}/like`);
      return response.data;
    },
    onSuccess: (data, articleId) => {
      // Invalidate and refetch articles
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
    },
  });
}
