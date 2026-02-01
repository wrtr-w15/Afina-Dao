import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import crypto from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

async function ensureTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS admin_uploads (
      id VARCHAR(36) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      \`data\` LONGBLOB NOT NULL,
      size INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// GET /api/admin/uploads — список загруженных файлов (без blob)
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const connection = await getConnection();
  try {
    await ensureTable(connection);
    const [rows] = await connection.execute(
      `SELECT id, filename, mime_type, size, created_at, updated_at FROM admin_uploads ORDER BY created_at DESC`
    );
    const baseUrl = request.nextUrl.origin;
    const uploads = (rows as any[]).map((r) => ({
      id: r.id,
      filename: r.filename,
      mimeType: r.mime_type,
      size: r.size,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      url: `${baseUrl}/api/uploads/${r.id}`,
    }));
    return NextResponse.json({ uploads });
  } catch (error) {
    console.error('Error listing uploads:', error);
    return NextResponse.json({ error: 'Failed to list' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/admin/uploads — загрузка файла
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  let connection: Awaited<ReturnType<typeof getConnection>> | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 10 МБ)' }, { status: 400 });
    }
    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: 'Допустимые форматы: JPEG, PNG, GIF, WebP, SVG' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomUUID();
    const filename = file.name || `image-${id}`;

    connection = await getConnection();
    await ensureTable(connection);
    await connection.execute(
      `INSERT INTO admin_uploads (id, filename, mime_type, \`data\`, size) VALUES (?, ?, ?, ?, ?)`,
      [id, filename, mimeType, buffer, file.size]
    );

    const baseUrl = request.nextUrl.origin;
    return NextResponse.json({
      id,
      filename,
      mimeType,
      size: file.size,
      url: `${baseUrl}/api/uploads/${id}`,
    });
  } catch (error) {
    console.error('Error uploading:', error);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
