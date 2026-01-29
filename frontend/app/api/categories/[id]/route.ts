import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/database';
import { UpdateCategoryData } from '../../../../types/category';

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

// GET /api/categories/[id] - получить категорию по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await getConnection();
  try {
    const { id } = await params;
    
    await ensureColumns(connection);
    
    const [categories] = await connection.execute(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if ((categories as any[]).length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const category = (categories as any[])[0];

    const formattedCategory = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      color: category.color || '#3B82F6',
      icon: category.icon,
      isActive: category.is_active !== undefined ? Boolean(category.is_active) : true,
      sortOrder: category.sort_order || 0,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    };

    return NextResponse.json(formattedCategory);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/categories/[id] - обновить категорию
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Проверка аутентификации администратора
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const data: UpdateCategoryData = await request.json();
  const connection = await getConnection();
  try {
    await ensureColumns(connection);
    
    // Проверяем, что категория существует
    const [existing] = await connection.execute(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    
    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Проверяем уникальность названия (если оно изменилось)
    if (data.name) {
      const [nameCheck] = await connection.execute(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [data.name, id]
      );
      
      if ((nameCheck as any[]).length > 0) {
        return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
      }
    }

    // Обновляем категорию
    await connection.execute(`
      UPDATE categories 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          is_active = COALESCE(?, is_active),
          sort_order = COALESCE(?, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.name,
      data.description,
      data.color,
      data.icon,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : null,
      data.sortOrder,
      id
    ]);

    return NextResponse.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/categories/[id] - удалить категорию
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Проверка аутентификации администратора
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  const connection = await getConnection();
  try {
    // Проверяем, что категория существует
    const [existing] = await connection.execute(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    
    if ((existing as any[]).length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Проверяем, используется ли категория в проектах
    const [projects] = await connection.execute(
      'SELECT id FROM projects WHERE category = (SELECT name FROM categories WHERE id = ?)',
      [id]
    );
    
    if ((projects as any[]).length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that is used in projects. Deactivate it instead.' 
      }, { status: 400 });
    }

    // Удаляем категорию
    await connection.execute('DELETE FROM categories WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  } finally {
    connection.release();
  }
}
