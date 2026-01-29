import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../lib/database';
import { Category, CreateCategoryData } from '../../../types/category';

// Генерация slug из названия
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Безопасное добавление колонки (игнорирует ошибку если колонка уже существует)
async function safeAddColumn(connection: any, columnDef: string): Promise<void> {
  try {
    await connection.execute(`ALTER TABLE categories ADD COLUMN ${columnDef}`);
  } catch (error: any) {
    // Игнорируем ошибку "Duplicate column name" (код 1060)
    if (error.errno !== 1060) {
      throw error;
    }
  }
}

// Проверяем и создаём недостающие колонки
async function ensureColumns(connection: any): Promise<void> {
  try {
    await safeAddColumn(connection, 'is_active TINYINT(1) DEFAULT 1');
    await safeAddColumn(connection, 'sort_order INT DEFAULT 0');
    await safeAddColumn(connection, 'color VARCHAR(20) DEFAULT \'#3B82F6\'');
    await safeAddColumn(connection, 'icon VARCHAR(50) DEFAULT NULL');
  } catch (error) {
    console.error('Error ensuring columns:', error);
  }
}

// GET /api/categories - получить все категории
export async function GET() {
  const connection = await getConnection();
  try {
    // Убеждаемся что все колонки существуют
    await ensureColumns(connection);
    
    const [categories] = await connection.execute(`
      SELECT * FROM categories 
      ORDER BY is_active DESC, sort_order ASC, name ASC
    `);

    // Преобразуем данные из базы в формат фронтенда
    const formattedCategories = (categories as any[]).map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || null,
      color: category.color || '#3B82F6',
      icon: category.icon || null,
      isActive: category.is_active !== undefined ? Boolean(category.is_active) : true,
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
    
    // Убеждаемся что все колонки существуют
    await ensureColumns(connection);
    
    // Проверяем, что название уникально
    const [existing] = await connection.execute(
      'SELECT id FROM categories WHERE name = ?',
      [data.name]
    );
    
    if ((existing as any[]).length > 0) {
      connection.release();
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    }
    
    // Генерируем slug из названия
    const slug = generateSlug(data.name);
    
    // Проверяем уникальность slug
    const [existingSlug] = await connection.execute(
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    );
    
    // Если slug уже существует, добавляем уникальный суффикс
    const finalSlug = (existingSlug as any[]).length > 0 
      ? `${slug}-${Date.now()}` 
      : slug;
    
    // Создаем новую категорию
    await connection.execute(`
      INSERT INTO categories (name, slug, description, color, icon, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      data.name,
      finalSlug,
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
      slug: category.slug,
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
