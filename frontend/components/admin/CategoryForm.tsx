import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { api } from '@/lib/api';
import { useCategories } from '@/hooks/useCategories';

interface CategoryFormData {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive: boolean;
}

export default function CategoryForm() {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<CategoryFormData>({
    defaultValues: {
      isActive: true,
      sortOrder: 0,
    },
  });

  const createCategoryMutation = useMutation(
    async (data: CategoryFormData) => {
      const response = await api.post('/categories', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['categories']);
        reset();
        alert('Category created successfully!');
      },
    }
  );

  const updateCategoryMutation = useMutation(
    async ({ id, data }: { id: number; data: CategoryFormData }) => {
      const response = await api.patch(`/categories/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['categories']);
        setEditingCategory(null);
        reset();
        alert('Category updated successfully!');
      },
    }
  );

  const deleteCategoryMutation = useMutation(
    async (id: number) => {
      await api.delete(`/categories/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['categories']);
        alert('Category deleted successfully!');
      },
    }
  );

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category.id);
    setValue('slug', category.slug);
    setValue('name', category.name);
    setValue('description', category.description || '');
    setValue('icon', category.icon || '');
    setValue('sortOrder', category.sortOrder || 0);
    setValue('isActive', category.isActive);
  };

  const handleCancel = () => {
    setEditingCategory(null);
    reset();
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {editingCategory ? t('editCategory') : t('createCategory')}
        </h2>
        {editingCategory && (
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            {t('cancel')}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('slug')}
              </label>
              <input
                {...register('slug', { required: 'Slug is required' })}
                className="input"
                placeholder="category-slug"
              />
              {errors.slug && (
                <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="input"
                placeholder="Category name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                className="input"
                rows={3}
                placeholder="Category description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <input
                {...register('icon')}
                className="input"
                placeholder="📚"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <input
                {...register('sortOrder', { valueAsNumber: true })}
                type="number"
                className="input"
                placeholder="0"
              />
            </div>
            
            <div className="flex items-center">
              <input
                {...register('isActive')}
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="ml-2 text-sm text-gray-700">Active</label>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                disabled={createCategoryMutation.isLoading || updateCategoryMutation.isLoading}
                className="btn-primary"
              >
                {createCategoryMutation.isLoading || updateCategoryMutation.isLoading 
                  ? 'Saving...' 
                  : editingCategory ? 'Update' : 'Create'
                }
              </button>
            </div>
          </form>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Existing Categories</h3>
          <div className="space-y-2">
            {categories?.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {category.icon && <span className="text-lg">{category.icon}</span>}
                  <div>
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-sm text-gray-600">{category.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
