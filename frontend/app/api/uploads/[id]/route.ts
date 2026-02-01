import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

// GET /api/uploads/[id] — отдача картинки по ссылке (публичный доступ для вставки в контент)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return new NextResponse(null, { status: 404 });

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT \`data\`, mime_type FROM admin_uploads WHERE id = ?`,
      [id]
    );
    const row = (rows as any[])[0];
    if (!row || !row.data) return new NextResponse(null, { status: 404 });

    const data = row.data instanceof Buffer ? row.data : Buffer.from(row.data);
    const mime = row.mime_type || 'application/octet-stream';

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } finally {
    connection.release();
  }
}
