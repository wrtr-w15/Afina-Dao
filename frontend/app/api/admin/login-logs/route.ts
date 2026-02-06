import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { ensureAdminLoginLogsTable } from '@/lib/admin-login-log';

const TABLE = 'admin_login_logs';

/** GET /api/admin/login-logs — список логов входов в админку (только для админа) */
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;
  const eventFilter = searchParams.get('event'); // 'success' | 'failure'

  const connection = await getConnection();
  try {
    await ensureAdminLoginLogsTable(connection);

    let whereClause = '1=1';
    const whereParams: (string | number)[] = [];
    if (eventFilter === 'success' || eventFilter === 'failure') {
      whereClause += ' AND event = ?';
      whereParams.push(eventFilter);
    }

    // LIMIT/OFFSET — числа, подставляем в запрос (mysql2 даёт ER_WRONG_ARGUMENTS при ? для LIMIT/OFFSET)
    const [rows] = await connection.execute(
      `SELECT id, ip, user_agent, event, details, created_at 
       FROM ${TABLE} 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      whereParams
    );

    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM ${TABLE} WHERE ${whereClause}`,
      whereParams
    );
    const total = (countResult as any[])[0]?.total ?? 0;

    const logs = (rows as any[]).map((row) => ({
      id: row.id,
      ip: row.ip,
      userAgent: row.user_agent || null,
      event: row.event,
      details: row.details || null,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching login logs:', error);
    return NextResponse.json({ error: 'Failed to fetch login logs' }, { status: 500 });
  } finally {
    connection.release();
  }
}
