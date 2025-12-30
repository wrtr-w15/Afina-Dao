import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../lib/database';
import { Category, CreateCategoryData } from '../../../types/category';

// GET /api/categories - получить все категории
export async function GET() {
  const connection = await getConnection();
  try {
    
    const [categories] = await connection.execute(`
      SELECT * FROM categories 
      ORDER BY is_active DESC, sort_order ASC, name ASC
    `);

    // Преобразуем данные из базы в формат фронтенда
    // Структура таблицы использует snake_case
    const formattedCategories = (categories as any[]).map(category => ({
      id: category.id,
      name: category.name,
      description: category.description || null,
      color: category.color || '#3B82F6', // Значение по умолчанию если поля нет
      icon: category.icon || null,
      isActive: Boolean(category.is_active),
      sortOrder: category.sort_order || 0,
      createdAt: category.created_at,
      updatedAt: category.updated_at
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
    // Структура таблицы использует snake_case
    const [result] = await connection.execute(`
      INSERT INTO categories (name, description, color, icon, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      data.description || null,
      data.color || '#3B82F6',
      data.icon || null,
      data.isActive !== false ? 1 : 0,
      data.sortOrder || 0
    ]);

    // Получаем созданную категорию для возврата (используем имя, так как оно уникально)
    const [createdCategory] = await connection.execute(
      'SELECT * FROM categories WHERE name = ?',
      [data.name]
    );

    if ((createdCategory as any[]).length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve created category' }, { status: 500 });
    }

    const category = (createdCategory as any[])[0];
    const formattedCategory = {
      id: category.id,
      name: category.name,
      description: category.description || null,
      color: category.color || '#3B82F6',
      icon: category.icon || null,
      isActive: Boolean(category.is_active),
      sortOrder: category.sort_order || 0,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    };

    return NextResponse.json(formattedCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
