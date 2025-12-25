import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/database';
import { UpdateCategoryData } from '../../../../types/category';

// GET /api/categories/[id] - получить категорию по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await getConnection();
  try {
    const { id } = await params;
    
    const [categories] = await connection.execute(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if ((categories as any[]).length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const category = (categories as any[])[0];

    // Преобразуем данные из базы в формат фронтенда
    const formattedCategory = {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
      isActive: Boolean(category.is_active),
      sortOrder: category.sort_order,
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
  try {
    // Проверка аутентификации администратора
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    const { id } = await params;
    const data: UpdateCategoryData = await request.json();
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
        data.isActive !== undefined ? data.isActive : undefined,
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
  try {
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
