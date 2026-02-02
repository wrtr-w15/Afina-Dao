import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

export type BlocklistType = 'telegram_subscription' | 'email' | 'discord';

async function ensureTable(connection: any): Promise<void> {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS blocklist (
      id VARCHAR(36) PRIMARY KEY,
      type ENUM('telegram_subscription', 'email', 'discord') NOT NULL,
      value VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_type_value (type, value(191)),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// GET /api/admin/blocklist — список заблокированных (опционально ?type=...)
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as BlocklistType | null;

  const connection = await getConnection();
  try {
    await ensureTable(connection);
    let query = 'SELECT id, type, value, created_at FROM blocklist';
    const params: string[] = [];
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    query += ' ORDER BY type, value';

    const [rows] = params.length
      ? await connection.execute(query, params)
      : await connection.execute(query);

    const items = (rows as any[]).map((r: any) => ({
      id: r.id,
      type: r.type,
      value: r.value,
      createdAt: r.created_at
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching blocklist:', error);
    return NextResponse.json({ error: 'Failed to fetch blocklist' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/admin/blocklist — добавить запись
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  let body: { type: BlocklistType; value: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, value } = body;
  const allowed: BlocklistType[] = ['telegram_subscription', 'email', 'discord'];
  if (!type || !allowed.includes(type)) {
    return NextResponse.json({ error: 'type must be telegram_subscription, email or discord' }, { status: 400 });
  }
  let trimmed = String(value || '').trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }
  if (type === 'email' || type === 'discord') trimmed = trimmed.toLowerCase();

  const connection = await getConnection();
  try {
    await ensureTable(connection);
    const id = crypto.randomUUID();
    await connection.execute(
      'INSERT INTO blocklist (id, type, value) VALUES (?, ?, ?)',
      [id, type, trimmed]
    );
    return NextResponse.json({ id, type, value: trimmed });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Такое значение уже в блокировке' }, { status: 409 });
    }
    console.error('Error adding blocklist:', e);
    return NextResponse.json({ error: 'Failed to add' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/admin/blocklist?id=... — удалить запись
export async function DELETE(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    const [result] = await connection.execute('DELETE FROM blocklist WHERE id = ?', [id]);
    const affected = (result as any).affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blocklist:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  } finally {
    connection.release();
  }
}
