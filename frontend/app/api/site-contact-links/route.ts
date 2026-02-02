import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

const DEFAULT_KEYS = [
  { key: 'telegram_channel_url', value: '' },
  { key: 'discord_invite_url', value: '' },
  { key: 'community_button_url', value: '' },
  { key: 'support_tg_1', value: 'kirjeyy' },
  { key: 'support_tg_2', value: 'ascys' },
] as const;

async function ensureTableAndDefaults(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS site_contact_links (
      \`key\` VARCHAR(64) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  for (const { key, value } of DEFAULT_KEYS) {
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
  supportTgUsernames: string[];
} {
  const map: Record<string, string> = {};
  for (const r of rows as { key: string; value: string | null }[]) {
    map[r.key] = r.value ?? '';
  }
  const supportTgUsernames: string[] = [];
  if ((map.support_tg_1 ?? '').trim()) supportTgUsernames.push((map.support_tg_1 as string).trim().replace(/^@/, ''));
  if ((map.support_tg_2 ?? '').trim()) supportTgUsernames.push((map.support_tg_2 as string).trim().replace(/^@/, ''));
  return {
    telegramChannelUrl: (map.telegram_channel_url ?? '').trim(),
    discordInviteUrl: (map.discord_invite_url ?? '').trim(),
    communityButtonUrl: (map.community_button_url ?? '').trim(),
    supportTgUsernames,
  };
}

// GET /api/site-contact-links — публичный, для страницы контактов
export async function GET() {
  const connection = await getConnection();
  try {
    await ensureTableAndDefaults(connection);
    const [rows] = await connection.execute(
      `SELECT \`key\`, value FROM site_contact_links WHERE \`key\` IN ('telegram_channel_url', 'discord_invite_url', 'community_button_url', 'support_tg_1', 'support_tg_2')`
    );
    return NextResponse.json(mapRowsToResponse(rows as any[]));
  } catch (error) {
    console.error('Error fetching site contact links:', error);
    return NextResponse.json(
      {
        telegramChannelUrl: '',
        discordInviteUrl: '',
        communityButtonUrl: '',
        supportTgUsernames: ['kirjeyy', 'ascys'],
      },
      { status: 200 }
    );
  } finally {
    connection.release();
  }
}
