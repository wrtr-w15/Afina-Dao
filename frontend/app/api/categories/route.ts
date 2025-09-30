import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '../../../lib/database';
import { Category, CreateCategoryData } from '../../../types/category';

// GET /api/categories - получить все категории
export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [categories] = await connection.execute(`
      SELECT * FROM categories 
      ORDER BY is_active DESC, sort_order ASC, name ASC
    `);

    await connection.end();

    // Преобразуем данные из базы в формат фронтенда
    const formattedCategories = (categories as any[]).map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      isActive: Boolean(category.is_active),
      sortOrder: category.sort_order,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories - создать новую категорию
export async function POST(request: NextRequest) {
  try {
    const data: CreateCategoryData = await request.json();
    const connection = await mysql.createConnection(dbConfig);
    
    // Проверяем, что название уникально
    const [existing] = await connection.execute(
      'SELECT id FROM categories WHERE name = ?',
      [data.name]
    );
    
    if ((existing as any[]).length > 0) {
      await connection.end();
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }

    // Создаем новую категорию
    const [result] = await connection.execute(`
      INSERT INTO categories (name, description, color, icon, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      data.description || null,
      data.color,
      data.icon || null,
      data.isActive !== false,
      data.sortOrder || 0
    ]);

    const categoryId = (result as any).insertId;

    await connection.end();

    return NextResponse.json({ 
      id: categoryId,
      message: 'Category created successfully' 
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
