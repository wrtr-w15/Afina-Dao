import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import crypto from 'crypto';

// GET /api/admin/telegram-texts — список всех текстов бота по разделам
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, \`key\`, section, value, description, sort_order 
       FROM telegram_bot_texts 
       ORDER BY section ASC, sort_order ASC, \`key\` ASC`
    );
    const texts = (rows as any[]).map((r) => ({
      id: r.id,
      key: r.key,
      section: r.section,
      value: r.value,
      description: r.description || '',
      sortOrder: r.sort_order
    }));
    return NextResponse.json({ texts });
  } catch (error) {
    console.error('Error fetching telegram texts:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/admin/telegram-texts — обновить один или несколько текстов
export async function PUT(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const body = await request.json();
  const { key, value } = body;
  const updates = Array.isArray(body.updates) ? body.updates : key != null ? [{ key, value }] : [];

  if (updates.length === 0) {
    return NextResponse.json({ error: 'key/value or updates[] required' }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    for (const u of updates) {
      if (!u.key || u.value === undefined) continue;
      await connection.execute(
        `UPDATE telegram_bot_texts SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE \`key\` = ?`,
        [u.value, u.key]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating telegram texts:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } finally {
    connection.release();
  }
}
