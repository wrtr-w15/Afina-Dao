import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

const KEYS = ['telegram_channel_url', 'discord_invite_url', 'community_button_url', 'support_tg_1', 'support_tg_2'] as const;

async function ensureTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS site_contact_links (
      \`key\` VARCHAR(64) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const defaults = [
    { key: 'telegram_channel_url', value: '' },
    { key: 'discord_invite_url', value: '' },
    { key: 'community_button_url', value: '' },
    { key: 'support_tg_1', value: 'kirjeyy' },
    { key: 'support_tg_2', value: 'ascys' },
  ];
  for (const { key, value } of defaults) {
    await connection.execute(
      `INSERT IGNORE INTO site_contact_links (\`key\`, value) VALUES (?, ?)`,
      [key, value]
    );
  }
}

function mapRowsToResponse(rows: any[]): {
  telegramChannelUrl: string;
  discordInviteUrl: string;
  communityButtonUrl: string;
  supportTg1: string;
  supportTg2: string;
} {
  const map: Record<string, string> = {};
  for (const r of rows as { key: string; value: string | null }[]) {
    map[r.key] = r.value ?? '';
  }
  return {
    telegramChannelUrl: (map.telegram_channel_url ?? '').trim(),
    discordInviteUrl: (map.discord_invite_url ?? '').trim(),
    communityButtonUrl: (map.community_button_url ?? '').trim(),
    supportTg1: (map.support_tg_1 ?? '').trim().replace(/^@/, ''),
    supportTg2: (map.support_tg_2 ?? '').trim().replace(/^@/, ''),
  };
}

// GET /api/admin/site-contact-links
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const connection = await getConnection();
  try {
    await ensureTable(connection);
    const [rows] = await connection.execute(
      `SELECT \`key\`, value FROM site_contact_links WHERE \`key\` IN ('telegram_channel_url', 'discord_invite_url', 'community_button_url', 'support_tg_1', 'support_tg_2')`
    );
    return NextResponse.json(mapRowsToResponse(rows as any[]));
  } catch (error) {
    console.error('Error fetching site contact links:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/admin/site-contact-links
export async function PUT(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const body = await request.json();
  const telegramChannelUrl = typeof body.telegramChannelUrl === 'string' ? body.telegramChannelUrl.trim() : '';
  const discordInviteUrl = typeof body.discordInviteUrl === 'string' ? body.discordInviteUrl.trim() : '';
  const communityButtonUrl = typeof body.communityButtonUrl === 'string' ? body.communityButtonUrl.trim() : '';
  const supportTg1 = typeof body.supportTg1 === 'string' ? body.supportTg1.trim().replace(/^@/, '') : '';
  const supportTg2 = typeof body.supportTg2 === 'string' ? body.supportTg2.trim().replace(/^@/, '') : '';

  const connection = await getConnection();
  try {
    await ensureTable(connection);
    await connection.execute(
      `INSERT INTO site_contact_links (\`key\`, value) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [
        'telegram_channel_url',
        telegramChannelUrl,
        'discord_invite_url',
        discordInviteUrl,
        'community_button_url',
        communityButtonUrl,
        'support_tg_1',
        supportTg1,
        'support_tg_2',
        supportTg2,
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating site contact links:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } finally {
    connection.release();
  }
}
