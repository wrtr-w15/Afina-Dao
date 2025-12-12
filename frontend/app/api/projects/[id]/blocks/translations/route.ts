import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '@/lib/database';
import { validateUUIDParam, applyRateLimit, logSuspiciousActivity } from '@/lib/security-middleware';
import { validateContentBlock } from '@/lib/validation';

// POST /api/projects/[id]/blocks/translations - сохранить переводы блоков
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверка аутентификации администратора
    const { checkAdminAuth } = await import('@/lib/security-middleware');
    const authResult = await checkAdminAuth();
    if (authResult) return authResult;

    // Rate limiting
    const rateLimitResult = applyRateLimit(request, 20, 60000); // 20 запросов в минуту
    if (rateLimitResult) return rateLimitResult;
    
    const { id: projectId } = await params;
    
    // Валидация UUID проекта
    const uuidValidation = validateUUIDParam(projectId, 'project ID');
    if (uuidValidation) {
      logSuspiciousActivity(request, 'Invalid project ID format in blocks translations', { projectId });
      return uuidValidation;
    }
    
    const data = await request.json();
    
    console.log('Saving block translations for project:', projectId);
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // data.blocks должен быть массивом блоков с переводами
    if (!data.blocks || !Array.isArray(data.blocks)) {
      return NextResponse.json({ error: 'Invalid data format: blocks must be an array' }, { status: 400 });
    }
    
    // Валидация каждого блока
    for (let i = 0; i < data.blocks.length; i++) {
      const block = data.blocks[i];
      const blockValidation = validateContentBlock(block);
      if (!blockValidation.valid) {
        console.error(`Block ${i} validation failed:`, blockValidation.error);
        return NextResponse.json({ 
          error: `Block ${i + 1}: ${blockValidation.error}` 
        }, { status: 400 });
      }
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Для каждого блока сохраняем переводы
    for (const block of data.blocks) {
      let blockId = block.id;
      
      // Если у блока нет ID - это новый блок, создаём его
      if (!blockId) {
        blockId = crypto.randomUUID();
        console.log(`Creating new block ${blockId} for project ${projectId}`);
        
        // Создаём новый блок в базе данных с пустыми базовыми полями
        // Все переводы будут храниться в project_block_translations
        await connection.execute(`
          INSERT INTO project_blocks (id, project_id, title, content, gif_url, gif_caption)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          blockId,
          projectId,
          '', // Пустой title - контент берётся из переводов
          '', // Пустой content - контент берётся из переводов
          block.gifUrl || null,
          null // Пустой gif_caption - контент берётся из переводов
        ]);
        
        console.log(`✓ Created new block ${blockId} with empty base fields`);
      } else {
        console.log(`Processing existing block ${blockId}:`, {
          hasTranslations: !!block.translations,
          translationsCount: block.translations?.length || 0
        });
        
        // Обновляем базовые поля существующего блока (если нужно)
        if (block.gifUrl !== undefined) {
          await connection.execute(`
            UPDATE project_blocks 
            SET gif_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [block.gifUrl || null, blockId]);
        }
      }
      
      // Сохраняем переводы блока
      if (block.translations && Array.isArray(block.translations)) {
        for (const translation of block.translations) {
          if (!translation.locale) {
            console.warn('Skipping translation without locale:', translation);
            continue;
          }
          
          console.log(`Saving translation for block ${blockId}, locale ${translation.locale}:`, {
            title: translation.title,
            contentLength: translation.content?.length || 0,
            gifCaption: translation.gifCaption
          });
          
          // Удаляем старый перевод для этой локали
          await connection.execute(`
            DELETE FROM project_block_translations 
            WHERE block_id = ? AND locale = ?
          `, [blockId, translation.locale]);
          
          // Вставляем новый перевод
          await connection.execute(`
            INSERT INTO project_block_translations (id, block_id, locale, title, content, gif_caption)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            crypto.randomUUID(),
            blockId,
            translation.locale,
            translation.title || '',
            translation.content || '',
            translation.gifCaption || null
          ]);
          
          console.log(`✓ Saved translation for block ${blockId}, locale ${translation.locale}`);
        }
      }
      
      // Обновляем ссылки блока (если есть)
      if (block.links !== undefined) {
        // Удаляем старые ссылки
        await connection.execute(`
          DELETE FROM project_block_links WHERE block_id = ?
        `, [blockId]);
        
        // Добавляем новые ссылки
        if (Array.isArray(block.links) && block.links.length > 0) {
          for (const link of block.links) {
            await connection.execute(`
              INSERT INTO project_block_links (id, block_id, title, url, type)
              VALUES (?, ?, ?, ?, ?)
            `, [
              link.id || crypto.randomUUID(),
              blockId,
              link.title || '',
              link.url || '',
              link.type || 'website'
            ]);
          }
        }
      }
    }
    
    await connection.end();
    
    console.log('✅ All block translations saved successfully');
    
    return NextResponse.json({ 
      message: 'Block translations saved successfully',
      blocksProcessed: data.blocks.length
    });
  } catch (error) {
    console.error('Error saving block translations:', error);
    return NextResponse.json({ 
      error: 'Failed to save block translations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/projects/[id]/blocks/translations - получить переводы блоков
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Получаем все блоки проекта
    const [blocks] = await connection.execute(`
      SELECT * FROM project_blocks WHERE project_id = ? ORDER BY created_at ASC
    `, [projectId]);
    
    // Для каждого блока получаем переводы
    const blocksWithTranslations = await Promise.all((blocks as any[]).map(async (block: any) => {
      const [translations] = await connection.execute(`
        SELECT * FROM project_block_translations WHERE block_id = ?
      `, [block.id]);
      
      const [links] = await connection.execute(`
        SELECT * FROM project_block_links WHERE block_id = ?
      `, [block.id]);
      
      return {
        id: block.id,
        gifUrl: block.gif_url,
        translations: (translations as any[]).map(t => ({
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
    
    await connection.end();
    
    return NextResponse.json({ blocks: blocksWithTranslations });
  } catch (error) {
    console.error('Error fetching block translations:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch block translations' 
    }, { status: 500 });
  }
}

