import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '../../../lib/database';
import { Project, CreateProjectData, ProjectBlock, ProjectLink } from '../../../types/project';

// GET /api/projects - получить все проекты
export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
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
        status: project.status,
        category: project.category,
        budget: project.budget,
        website: project.website,
        telegramPost: project.telegram_post,
        image: project.image,
        translations: (translations as any[]).map(t => ({
          locale: t.locale,
          name: t.name,
          description: t.description
        })),
        blocks: [], // Пока без блоков
        createdAt: project.created_at,
        updatedAt: project.updated_at
      };
    }));

    await connection.end();

    return NextResponse.json(projectsWithTranslations);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - создать новый проект
export async function POST(request: NextRequest) {
  try {
    const data: CreateProjectData = await request.json();
    console.log('API: Received project data:', data);
    console.log('API: data.blocks type:', typeof data.blocks);
    console.log('API: data.blocks is array:', Array.isArray(data.blocks));
    console.log('API: data.blocks value:', data.blocks);
    console.log('API: data.status type:', typeof data.status);
    console.log('API: data.status value:', data.status);
    
    // Очищаем и валидируем данные
    const cleanStatus = typeof data.status === 'string' && ['active', 'draft', 'inactive'].includes(data.status) 
      ? data.status 
      : 'draft';
    
    console.log('API: cleanStatus:', cleanStatus);
    
    const connection = await mysql.createConnection(dbConfig);
    
    const projectId = crypto.randomUUID();
    
    // Создаем проект
    await connection.execute(`
      INSERT INTO projects (id, name, sidebar_name, description, status, category, budget, website, telegram_post, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectId,
      data.name,
      data.sidebarName,
      data.description,
      cleanStatus,
      data.category,
      data.budget || null,
      data.website || null,
      data.telegramPost || null,
      data.image || null
    ]);

    // Сохраняем переводы проекта (если есть)
    if (data.translations && Array.isArray(data.translations)) {
      for (const translation of data.translations) {
        await connection.execute(`
          INSERT INTO project_translations (id, project_id, locale, name, description)
          VALUES (?, ?, ?, ?, ?)
        `, [
          crypto.randomUUID(),
          projectId,
          translation.locale,
          translation.name,
          translation.description
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

    await connection.end();

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
  }
}
