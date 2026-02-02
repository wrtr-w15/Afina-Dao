import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnection } from '../../../lib/database';
import { Project, CreateProjectData, ProjectBlock, ProjectLink } from '../../../types/project';

// Безопасное добавление колонки (игнорирует ошибку если колонка уже существует)
async function safeAddColumn(connection: any, table: string, columnDef: string): Promise<void> {
  try {
    await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  } catch (error: any) {
    // Игнорируем ошибку "Duplicate column name" (код 1060)
    if (error.errno !== 1060) {
      throw error;
    }
  }
}

// Проверяем и создаём недостающие колонки в таблице projects
async function ensureProjectColumns(connection: any): Promise<void> {
  try {
    await safeAddColumn(connection, 'projects', 'content TEXT NULL');
  } catch (error) {
    console.error('Error ensuring project columns:', error);
  }
}

// GET /api/projects - получить все проекты
export async function GET() {
  const connection = await getConnection();
  try {
    
    // Получаем все проекты
    const [projects] = await connection.execute(`
      SELECT * FROM projects ORDER BY created_at DESC
    `);

    // Для каждого проекта получаем переводы
    const projectsWithTranslations = await Promise.all((projects as any[]).map(async (project: any) => {
      const [translations] = await connection.execute(`
        SELECT * FROM project_translations WHERE project_id = ?
      `, [project.id]);

      return {
        id: project.id,
        name: project.name,
        sidebarName: project.sidebar_name,
        description: project.description,
        content: project.content,
        status: project.status,
        category: project.category,
        budget: project.budget,
        website: project.website,
        telegramPost: project.telegram_post,
        image: project.image,
        translations: (translations as any[]).map(t => ({
          locale: t.locale,
          name: t.name,
          description: t.description,
          content: t.content
        })),
        blocks: [], // Legacy - kept for backward compatibility
        createdAt: project.created_at,
        updatedAt: project.updated_at
      };
    }));

    return NextResponse.json(projectsWithTranslations);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/projects - создать новый проект
export async function POST(request: NextRequest) {
  let connection;
  try {
    // Проверка аутентификации администратора
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth(request);
    if (authResult) return authResult;

    const data: CreateProjectData = await request.json();
    
    console.log('API received data:', JSON.stringify(data, null, 2));
    console.log('API received status:', data.status, typeof data.status);
    
    // Очищаем и валидируем данные
    const cleanStatus = typeof data.status === 'string' && ['active', 'draft', 'inactive'].includes(data.status) 
      ? data.status 
      : 'draft';
    
    console.log('API cleanStatus:', cleanStatus);
    
    connection = await getConnection();
    
    // Убеждаемся, что все необходимые колонки существуют
    await ensureProjectColumns(connection);
    
    const projectId = crypto.randomUUID();
    
    // Создаем проект
    await connection.execute(`
      INSERT INTO projects (id, name, sidebar_name, description, content, status, category, budget, website, telegram_post, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectId,
      data.name,
      data.sidebarName,
      data.description,
      data.content || null,
      cleanStatus,
      data.category,
      data.budget || null,
      data.website || null,
      data.telegramPost || null,
      data.image || null
    ]);

    // Убеждаемся, что в project_translations есть колонка content
    try {
      await connection.execute(`
        ALTER TABLE project_translations ADD COLUMN content TEXT NULL
      `);
    } catch (e: any) {
      if (e.errno !== 1060) throw e; // 1060 = колонка уже существует
    }

    // Сохраняем переводы проекта (включая content)
    if (data.translations && Array.isArray(data.translations)) {
      for (const translation of data.translations) {
        await connection.execute(`
          INSERT INTO project_translations (id, project_id, locale, name, description, content)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          crypto.randomUUID(),
          projectId,
          translation.locale,
          translation.name,
          translation.description,
          translation.content || null
        ]);
      }
    }

    // Создаем блоки проекта
    if (data.blocks && Array.isArray(data.blocks)) {
      for (const block of data.blocks) {
      const blockId = crypto.randomUUID();
      
      // Вставляем базовый блок (используем первый перевод или прямые значения)
      const firstTranslation = block.translations?.[0];
      await connection.execute(`
        INSERT INTO project_blocks (id, project_id, title, content, gif_url, gif_caption)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        blockId,
        projectId,
        firstTranslation?.title || block.title || '',
        firstTranslation?.content || block.content || '',
        block.gifUrl || null,
        firstTranslation?.gifCaption || block.gifCaption || null
      ]);

      // Сохраняем переводы блока
      if (block.translations && Array.isArray(block.translations)) {
        for (const translation of block.translations) {
          await connection.execute(`
            INSERT INTO project_block_translations (id, block_id, locale, title, content, gif_caption)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            crypto.randomUUID(),
            blockId,
            translation.locale,
            translation.title,
            translation.content,
            translation.gifCaption || null
          ]);
        }
      }

      // Создаем ссылки блока
      if (block.links && block.links.length > 0) {
        for (const link of block.links) {
          const linkId = crypto.randomUUID();
          
          await connection.execute(`
            INSERT INTO project_block_links (id, block_id, title, url, type)
            VALUES (?, ?, ?, ?, ?)
          `, [
            linkId,
            blockId,
            link.title,
            link.url,
            link.type
          ]);
        }
      }
    }
    }

    // Сигнализируем об обновлении данных (для очистки кэша на клиенте)
    return NextResponse.json({ 
      id: projectId, 
      message: 'Project created successfully',
      cacheInvalidated: true 
    });
  } catch (error) {
    console.error('Error creating project:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: 'Failed to create project',
      message: errorMessage,
      timestamp: new Date().toISOString()
    };
    
    console.error('Returning error response:', errorDetails);
    return NextResponse.json(errorDetails, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
