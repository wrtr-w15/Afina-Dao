// API для работы с категориями в MySQL базе данных

import { Category, CreateCategoryData, UpdateCategoryData } from '../types/category';

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

// Получить все категории
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories`);
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error loading categories:', error);
    return [];
  }
};

// Получить категорию по ID
export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${id}`);
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error loading category:', error);
    return null;
  }
};

// Создать новую категорию
export const createCategory = async (data: CreateCategoryData): Promise<Category> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

// Обновить категорию
export const updateCategory = async (data: UpdateCategoryData): Promise<Category | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

// Удалить категорию
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: 'DELETE',
    });
    await handleApiResponse(response);
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};