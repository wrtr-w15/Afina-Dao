import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnection } from '../../../../lib/database';
import { validateUUIDParam, applyRateLimit, logSuspiciousActivity } from '../../../../lib/security-middleware';
import { 
  validateProjectName, 
  validateProjectStatus, 
  validateImageURL,
  validateProjectTranslation 
} from '../../../../lib/validation';

// GET /api/projects/[id] - получить проект по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimitResult = applyRateLimit(request, 60, 60000); // 60 запросов в минуту
    if (rateLimitResult) return rateLimitResult;
    
    const { id } = await params;
    
    // Валидация UUID
    const uuidValidation = validateUUIDParam(id, 'project ID');
    if (uuidValidation) {
      logSuspiciousActivity(request, 'Invalid project ID format', { id });
      return uuidValidation;
    }
    
    const connection = await getConnection();
    try {
      // Получаем основную информацию о проекте
      const [projects] = await connection.execute(`
        SELECT p.* FROM projects p WHERE p.id = ?
      `, [id]);
      
      if ((projects as any[]).length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    
      const project = (projects as any[])[0];
      
      // Получаем переводы
      const [translations] = await connection.execute(`
        SELECT * FROM project_translations WHERE project_id = ?
      `, [id]);
      
      // Получаем блоки
      const [blocks] = await connection.execute(`
        SELECT * FROM project_blocks WHERE project_id = ? ORDER BY created_at ASC
      `, [id]);
      
      // Для каждого блока получаем переводы и ссылки
      const blocksWithTranslations = await Promise.all((blocks as any[]).map(async (block: any) => {
        // Получаем переводы блока
        const [blockTranslations] = await connection.execute(`
          SELECT * FROM project_block_translations WHERE block_id = ?
        `, [block.id]);
        
        // Получаем ссылки
        const [links] = await connection.execute(`
          SELECT * FROM project_block_links WHERE block_id = ?
        `, [block.id]);
        
        return {
          id: block.id,
          title: block.title,
          content: block.content,
          gifUrl: block.gif_url,
          gifCaption: block.gif_caption,
          translations: (blockTranslations as any[]).map(t => ({
            locale: t.locale,
            title: t.title,
            content: t.content,
            gifCaption: t.gif_caption
          })),
          links: (links as any[]).map(link => ({
            id: link.id,
            title: link.title,
            url: link.url,
            type: link.type
          }))
        };
      }));

      // Преобразуем данные из базы в формат фронтенда
      const formattedProject = {
        id: project.id,
        name: project.name,
        sidebarName: project.sidebar_name,
        description: project.description,
        status: project.status,
        category: project.category,
        website: project.website,
        telegramPost: project.telegram_post,
        image: project.image,
        translations: (translations as any[]).map(t => ({
          locale: t.locale,
          name: t.name,
          description: t.description
        })),
        blocks: blocksWithTranslations,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      };

      return NextResponse.json(formattedProject);
    } catch (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PUT /api/projects/[id] - обновить проект
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Проверка аутентификации администратора
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  // Rate limiting (более строгий для изменяющих операций)
  const rateLimitResult = applyRateLimit(request, 30, 60000); // 30 запросов в минуту
  if (rateLimitResult) return rateLimitResult;
  
  const { id } = await params;
  
  // Валидация UUID
  const uuidValidation = validateUUIDParam(id, 'project ID');
  if (uuidValidation) {
    logSuspiciousActivity(request, 'Invalid project ID format in PUT', { id });
    return uuidValidation;
  }
  
  const data = await request.json();
  
  // Валидация входных данных
  if (data.sidebarName) {
    const nameValidation = validateProjectName(data.sidebarName);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }
  }
  
  if (data.status) {
    const statusValidation = validateProjectStatus(data.status);
    if (!statusValidation.valid) {
      logSuspiciousActivity(request, 'Invalid project status', { status: data.status });
      return NextResponse.json({ error: statusValidation.error }, { status: 400 });
    }
  }
  
  if (data.image) {
    const imageValidation = validateImageURL(data.image);
    if (!imageValidation.valid) {
      return NextResponse.json({ error: imageValidation.error }, { status: 400 });
    }
  }
  
  // Валидация переводов
  if (data.translations && Array.isArray(data.translations)) {
    for (const translation of data.translations) {
      const translationValidation = validateProjectTranslation(translation);
      if (!translationValidation.valid) {
        return NextResponse.json({ error: `Translation error: ${translationValidation.error}` }, { status: 400 });
      }
    }
  }
  
  const connection = await getConnection();
  try {
    // Обновляем основную информацию проекта
    await connection.execute(`
      UPDATE projects 
      SET sidebar_name = ?, status = ?, category = ?, 
          website = ?, telegram_post = ?, image = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.sidebarName,
      data.status,
      data.category,
      data.website || null,
      data.telegramPost || null,
      data.image || null,
      id
    ]);
    
    // Сохраняем переводы
    if (data.translations && Array.isArray(data.translations)) {
      for (const translation of data.translations) {
        await connection.execute(`
          INSERT INTO project_translations (id, project_id, locale, name, description)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            description = VALUES(description),
            updated_at = CURRENT_TIMESTAMP
        `, [
          crypto.randomUUID(),
          id,
          translation.locale,
          translation.name,
          translation.description
        ]);
      }
    }

    // Блоки теперь обновляются через отдельное API /api/projects/[id]/blocks/translations
    // Здесь обновляем только основную информацию проекта

    // Сигнализируем об обновлении данных (для очистки кэша на клиенте)
    return NextResponse.json({ 
      message: 'Project updated successfully',
      cacheInvalidated: true 
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/projects/[id] - удалить проект
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Проверка аутентификации администратора
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  // Rate limiting (строгий для удаления)
  const rateLimitResult = applyRateLimit(request, 10, 60000); // 10 запросов в минуту
  if (rateLimitResult) return rateLimitResult;
  
  const { id } = await params;
  
  // Валидация UUID
  const uuidValidation = validateUUIDParam(id, 'project ID');
  if (uuidValidation) {
    logSuspiciousActivity(request, 'Invalid project ID format in DELETE', { id });
    return uuidValidation;
  }
  
  const connection = await getConnection();
  try {
    // Удаляем проект (каскадное удаление удалит блоки и ссылки)
    await connection.execute(`DELETE FROM projects WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  } finally {
    connection.release();
  }
}
