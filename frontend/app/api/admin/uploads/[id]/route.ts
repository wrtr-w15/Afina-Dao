import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

// GET /api/admin/uploads/[id] — метаданные (для админки)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT id, filename, mime_type, size, created_at FROM admin_uploads WHERE id = ?`,
      [id]
    );
    const row = (rows as any[])[0];
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const baseUrl = request.nextUrl.origin;
    return NextResponse.json({
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size,
      createdAt: row.created_at,
      url: `${baseUrl}/api/uploads/${row.id}`,
    });
  } finally {
    connection.release();
  }
}

// PUT /api/admin/uploads/[id] — переименовать или заменить файл
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const contentType = request.headers.get('content-type') || '';
  const connection = await getConnection();

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const newFilename = (formData.get('filename') as string)?.trim();

      const MAX_SIZE = 10 * 1024 * 1024;
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

      if (file && file instanceof File) {
        if (file.size > MAX_SIZE) {
          return NextResponse.json({ error: 'Файл слишком большой (макс. 10 МБ)' }, { status: 400 });
        }
        const mimeType = file.type || 'application/octet-stream';
        if (!ALLOWED_TYPES.includes(mimeType)) {
          return NextResponse.json({ error: 'Допустимые форматы: JPEG, PNG, GIF, WebP, SVG' }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = newFilename || file.name || `image-${id}`;
        await connection.execute(
          `UPDATE admin_uploads SET filename = ?, mime_type = ?, \`data\` = ?, size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [filename, mimeType, buffer, file.size, id]
        );
      } else if (newFilename) {
        await connection.execute(
          `UPDATE admin_uploads SET filename = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newFilename, id]
        );
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const newFilename = typeof body.filename === 'string' ? body.filename.trim() : null;
      if (newFilename) {
        await connection.execute(
          `UPDATE admin_uploads SET filename = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newFilename, id]
        );
      }
    }

    const [rows] = await connection.execute(
      `SELECT id, filename, mime_type, size FROM admin_uploads WHERE id = ?`,
      [id]
    );
    const row = (rows as any[])[0];
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const baseUrl = request.nextUrl.origin;
    return NextResponse.json({
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size,
      url: `${baseUrl}/api/uploads/${row.id}`,
    });
  } catch (error) {
    console.error('Error updating upload:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE /api/admin/uploads/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const connection = await getConnection();
  try {
    const [result] = await connection.execute(`DELETE FROM admin_uploads WHERE id = ?`, [id]);
    const affected = (result as any).affectedRows;
    if (affected === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting upload:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  } finally {
    connection.release();
  }
}
