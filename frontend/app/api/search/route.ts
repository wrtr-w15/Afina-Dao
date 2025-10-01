import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '../../../lib/database';

// GET /api/search - поиск проектов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

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
      WHERE p.name LIKE ? 
         OR p.sidebar_name LIKE ? 
         OR p.description LIKE ?
         OR p.category LIKE ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

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
      blocks: project.blocks ? project.blocks
        .filter((block: any) => block.id)
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
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error('Error searching projects:', error);
    return NextResponse.json({ error: 'Failed to search projects' }, { status: 500 });
  }
}
