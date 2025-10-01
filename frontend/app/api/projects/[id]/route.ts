import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '../../../../lib/database';
import { invalidateCache } from '../../../../lib/sidebarCache';

// GET /api/projects/[id] - получить проект по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [projects] = await connection.execute(`
      SELECT p.*, 
             COALESCE(
               JSON_ARRAYAGG(
                 CASE 
                   WHEN pb.id IS NOT NULL THEN
                     JSON_OBJECT(
                       'id', pb.id,
                       'title', pb.title,
                       'content', pb.content,
                       'gifUrl', pb.gif_url,
                       'gifCaption', pb.gif_caption,
                       'links', COALESCE(links_data.links, JSON_ARRAY())
                     )
                   ELSE NULL
                 END
               ), 
               JSON_ARRAY()
             ) as blocks
      FROM projects p
      LEFT JOIN project_blocks pb ON p.id = pb.project_id
      LEFT JOIN (
        SELECT pbl.block_id,
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', pbl.id,
                   'title', pbl.title,
                   'url', pbl.url,
                   'type', pbl.type
                 )
               ) as links
        FROM project_block_links pbl
        GROUP BY pbl.block_id
      ) links_data ON pb.id = links_data.block_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [id]);

    await connection.end();

    if ((projects as any[]).length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = (projects as any[])[0];

        // Преобразуем данные из базы в формат фронтенда
        const formattedProject = {
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
          blocks: project.blocks ? project.blocks
            .filter((block: any) => block.id)
            .sort((a: any, b: any) => {
              // Сортируем блоки по дате создания (если есть поле created_at)
              // Пока что возвращаем в том порядке, в котором пришли из БД
              return 0;
            })
            .map((block: any) => ({
              id: block.id,
              title: block.title,
              content: block.content,
              gifUrl: block.gifUrl,
              gifCaption: block.gifCaption,
              links: block.links || []
            })) : [],
          createdAt: project.created_at,
          updatedAt: project.updated_at
        };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error('Error fetching project:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/projects/[id] - обновить проект
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const data = await request.json();
    const connection = await mysql.createConnection(dbConfig);
    
    // Обновляем проект
    await connection.execute(`
      UPDATE projects 
      SET name = ?, sidebar_name = ?, description = ?, status = ?, category = ?, 
          website = ?, telegram_post = ?, image = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.name,
      data.sidebarName,
      data.description,
      data.status,
      data.category,
      data.website || null,
      data.telegramPost || null,
      data.image || null,
      id
    ]);

    // Удаляем старые блоки и создаем новые
    await connection.execute(`DELETE FROM project_blocks WHERE project_id = ?`, [id]);

    // Создаем новые блоки
    for (const block of data.blocks || []) {
      const blockId = crypto.randomUUID();
      
      await connection.execute(`
        INSERT INTO project_blocks (id, project_id, title, content, gif_url)
        VALUES (?, ?, ?, ?, ?)
      `, [
        blockId,
        id,
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

    // Инвалидируем кэш сайдбара
    invalidateCache();

    return NextResponse.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - удалить проект
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Удаляем проект (каскадное удаление удалит блоки и ссылки)
    await connection.execute(`DELETE FROM projects WHERE id = ?`, [id]);

    await connection.end();

    // Инвалидируем кэш сайдбара
    invalidateCache();

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
