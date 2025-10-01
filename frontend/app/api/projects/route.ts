import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '../../../lib/database';
import { Project, CreateProjectData, ProjectBlock, ProjectLink } from '../../../types/project';
import { invalidateCache } from '../../../lib/sidebarCache';

// GET /api/projects - получить все проекты
export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Простой запрос для начала
    const [projects] = await connection.execute(`
      SELECT * FROM projects ORDER BY created_at DESC
    `);

    await connection.end();

        // Преобразуем данные из базы в формат фронтенда
        const formattedProjects = (projects as any[]).map(project => ({
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
          blocks: [], // Пока без блоков
          createdAt: project.created_at,
          updatedAt: project.updated_at
        }));

    return NextResponse.json(formattedProjects);
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

    // Создаем блоки проекта
    if (data.blocks && Array.isArray(data.blocks)) {
      for (const block of data.blocks) {
      const blockId = crypto.randomUUID();
      
      await connection.execute(`
        INSERT INTO project_blocks (id, project_id, title, content, gif_url, gif_caption)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        blockId,
        projectId,
        block.title,
        block.content,
        block.gifUrl || null,
        block.gifCaption || null
      ]);

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

    // Инвалидируем кэш сайдбара
    invalidateCache();

    return NextResponse.json({ id: projectId, message: 'Project created successfully' });
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
