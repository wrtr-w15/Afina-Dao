import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '../../../lib/database';
import { Project, CreateProjectData, ProjectBlock, ProjectLink } from '../../../types/project';

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
          compatibility: project.compatibility ?
            (typeof project.compatibility === 'string' ?
              (project.compatibility.startsWith('[') ? JSON.parse(project.compatibility) : project.compatibility.split(',')) :
              project.compatibility) : [],
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
    const connection = await mysql.createConnection(dbConfig);
    
    const projectId = crypto.randomUUID();
    
    // Создаем проект
    await connection.execute(`
      INSERT INTO projects (id, name, sidebar_name, description, status, category, budget, website, telegram_post, image, compatibility)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectId,
      data.name,
      data.sidebarName,
      data.description,
      data.status,
      data.category,
      data.budget || null,
      data.website || null,
      data.telegramPost || null,
      data.image || null,
      JSON.stringify(data.compatibility)
    ]);

    // Создаем блоки проекта
    for (const block of data.blocks) {
      const blockId = crypto.randomUUID();
      
      await connection.execute(`
        INSERT INTO project_blocks (id, project_id, title, content, gif_url)
        VALUES (?, ?, ?, ?, ?)
      `, [
        blockId,
        projectId,
        block.title,
        block.content,
        block.gifUrl || null
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

    await connection.end();

    return NextResponse.json({ id: projectId, message: 'Project created successfully' });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
