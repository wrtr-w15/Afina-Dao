import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../lib/database';
import { Category, CreateCategoryData } from '../../../types/category';

// GET /api/categories - получить все категории
export async function GET() {
  const connection = await getConnection();
  try {
    
    const [categories] = await connection.execute(`
      SELECT * FROM categories 
      ORDER BY isActive DESC, sortOrder ASC, name ASC
    `);

    // Преобразуем данные из базы в формат фронтенда
    // Структура таблицы использует camelCase
    const formattedCategories = (categories as any[]).map(category => ({
      id: category.id,
      name: category.name,
      description: category.description || null,
      color: category.color || '#3B82F6', // Значение по умолчанию если поля нет
      icon: category.icon || null,
      isActive: Boolean(category.isActive),
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/categories - создать новую категорию
export async function POST(request: NextRequest) {
  let connection;
  try {
    // Проверка аутентификации администратора
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    const data: CreateCategoryData = await request.json();
    connection = await getConnection();
    
    // Проверяем, что название уникально
    const [existing] = await connection.execute(
      'SELECT id FROM categories WHERE name = ?',
      [data.name]
    );
    
    if ((existing as any[]).length > 0) {
      connection.release();
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }

    // Создаем новую категорию
    // Структура таблицы использует camelCase
    const [result] = await connection.execute(`
      INSERT INTO categories (name, description, color, icon, isActive, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      data.description || null,
      data.color || '#3B82F6',
      data.icon || null,
      data.isActive !== false ? 1 : 0,
      data.sortOrder || 0
    ]);

    const categoryId = (result as any).insertId;

    return NextResponse.json({ 
      id: categoryId,
      message: 'Category created successfully' 
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
