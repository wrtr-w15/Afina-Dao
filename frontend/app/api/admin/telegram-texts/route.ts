import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { clearBotTextCache } from '@/lib/telegram-bot/get-text';
import crypto from 'crypto';

const DEFAULT_SUBSCRIPTION_EXPIRING_3_DAYS =
  '⚠️ <b>Ваша подписка скоро истечёт!</b>\n\n📅 Дата окончания: {{endDate}}\n⏳ Осталось: {{daysLeft}} дн.\n\nПродлите подписку, чтобы не потерять доступ. Нажмите /start или кнопку «Продлить подписку».';

async function ensureTableAndDefaults(connection: any): Promise<void> {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS telegram_bot_texts (
      id VARCHAR(36) PRIMARY KEY,
      \`key\` VARCHAR(100) NOT NULL UNIQUE,
      section VARCHAR(50) NOT NULL DEFAULT 'common',
      value TEXT,
      description VARCHAR(500) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_section (section)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [existing] = await connection.execute(
    'SELECT id FROM telegram_bot_texts WHERE `key` = ?',
    ['subscription_expiring_3_days']
  );
  if ((existing as any[]).length === 0) {
    await connection.execute(
      `INSERT INTO telegram_bot_texts (id, \`key\`, section, value, description, sort_order)
       VALUES (?, 'subscription_expiring_3_days', 'notifications', ?, ?, 10)`,
      [
        crypto.randomUUID(),
        DEFAULT_SUBSCRIPTION_EXPIRING_3_DAYS,
        'Уведомление в Telegram, когда до конца подписки остаётся 3 дня. Подстановки: {{endDate}}, {{daysLeft}}'
      ]
    );
  }
  // Колонка кнопок (JSON): массив рядов кнопок [[{text, callback_data?|url?}, ...], ...]
  try {
    await connection.execute(`
      ALTER TABLE telegram_bot_texts ADD COLUMN buttons JSON NULL COMMENT 'Кнопки к сообщению: [[{text,callback_data?|url?}]]'
    `);
  } catch (e: any) {
    if (e.errno !== 1060) throw e;
  }
  // Условие для уведомлений (section=notifications): { type: "days_before_expiry", days: N }
  try {
    await connection.execute(`
      ALTER TABLE telegram_bot_texts ADD COLUMN notification_condition JSON NULL COMMENT 'Условие отправки: {"type":"days_before_expiry","days":N}'
    `);
  } catch (e: any) {
    if (e.errno !== 1060) throw e;
  }
  // Для существующего блока «3 дня» задаём условие по умолчанию
  await connection.execute(
    `UPDATE telegram_bot_texts SET notification_condition = ? WHERE \`key\` = 'subscription_expiring_3_days' AND (notification_condition IS NULL OR notification_condition = 'null')`,
    [JSON.stringify({ type: 'days_before_expiry', days: 3 })]
  );
}

// GET /api/admin/telegram-texts — список всех текстов бота по разделам
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const connection = await getConnection();
  try {
    await ensureTableAndDefaults(connection);
    const [rows] = await connection.execute(
      `SELECT id, \`key\`, section, value, description, sort_order, buttons, notification_condition 
       FROM telegram_bot_texts 
       ORDER BY section ASC, sort_order ASC, \`key\` ASC`
    );
    const texts = (rows as any[]).map((r) => {
      let buttons: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [];
      if (r.buttons != null) {
        if (typeof r.buttons === 'string') {
          try {
            buttons = JSON.parse(r.buttons);
          } catch {}
        } else if (Array.isArray(r.buttons)) {
          buttons = r.buttons as typeof buttons;
        }
      }
      let notificationCondition: { type: string; days?: number } | null = null;
      if (r.notification_condition != null) {
        if (typeof r.notification_condition === 'string') {
          try {
            notificationCondition = JSON.parse(r.notification_condition);
          } catch {}
        } else if (r.notification_condition && typeof r.notification_condition === 'object') {
          notificationCondition = r.notification_condition as { type: string; days?: number };
        }
      }
      return {
        id: r.id,
        key: r.key,
        section: r.section,
        value: r.value,
        description: r.description || '',
        sortOrder: r.sort_order,
        buttons,
        notificationCondition
      };
    });
    return NextResponse.json({ texts });
  } catch (error) {
    console.error('Error fetching telegram texts:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/admin/telegram-texts — создать новый блок сообщения
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const body = await request.json();
  const { key, section, value, description, sort_order, buttons, notification_condition } = body;
  const keyStr = typeof key === 'string' ? key.trim() : '';
  if (!keyStr) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  const connection = await getConnection();
  try {
    await ensureTableAndDefaults(connection);
    const [existing] = await connection.execute(
      'SELECT id FROM telegram_bot_texts WHERE `key` = ?',
      [keyStr]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'Блок с таким ключом уже существует' }, { status: 400 });
    }

    const sectionVal = typeof section === 'string' ? section.trim() || 'common' : 'common';
    const valueVal = typeof value === 'string' ? value : '';
    const descVal = typeof description === 'string' ? description.trim() : '';
    const sortVal = typeof sort_order === 'number' ? sort_order : 100;
    let buttonsJson: string | null = null;
    if (buttons != null && Array.isArray(buttons)) {
      const normalized = (buttons as any[][]).map((row) =>
        (Array.isArray(row) ? row : []).map((btn: any) => ({
          text: typeof btn?.text === 'string' ? btn.text.trim() : '',
          callback_data: typeof btn?.callback_data === 'string' ? btn.callback_data.trim() : undefined,
          url: typeof btn?.url === 'string' ? btn.url.trim() : undefined
        })).filter((btn: any) => btn.text !== '')
      ).filter((row: any[]) => row.length > 0);
      buttonsJson = JSON.stringify(normalized);
    }
    let notificationConditionJson: string | null = null;
    if (sectionVal === 'notifications' && notification_condition != null && typeof notification_condition === 'object') {
      const nc = notification_condition as { type?: string; days?: number };
      if (nc.type === 'days_before_expiry' && typeof nc.days === 'number' && nc.days >= 1) {
        notificationConditionJson = JSON.stringify({ type: 'days_before_expiry', days: nc.days });
      }
    }

    await connection.execute(
      `INSERT INTO telegram_bot_texts (id, \`key\`, section, value, description, sort_order, buttons, notification_condition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), keyStr, sectionVal, valueVal, descVal, sortVal, buttonsJson, notificationConditionJson]
    );
    clearBotTextCache();
    return NextResponse.json({ ok: true, key: keyStr });
  } catch (error) {
    console.error('Error creating telegram text:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
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
    await ensureTableAndDefaults(connection);
    for (const u of updates) {
      if (!u.key || u.value === undefined) continue;
      let buttonsJson: string | null = null;
      if (u.buttons != null && Array.isArray(u.buttons)) {
        const normalized = (u.buttons as any[][]).map((row) =>
          (Array.isArray(row) ? row : []).map((btn: any) => ({
            text: typeof btn?.text === 'string' ? btn.text.trim() : '',
            callback_data: typeof btn?.callback_data === 'string' ? btn.callback_data.trim() : undefined,
            url: typeof btn?.url === 'string' ? btn.url.trim() : undefined
          })).filter((btn: any) => btn.text !== '')
        ).filter((row: any[]) => row.length > 0);
        buttonsJson = JSON.stringify(normalized);
      }
      let notificationConditionJson: string | null | undefined = undefined;
      if (Object.prototype.hasOwnProperty.call(u, 'notification_condition')) {
        if (u.notification_condition != null && typeof u.notification_condition === 'object') {
          const nc = u.notification_condition as { type?: string; days?: number };
          if (nc.type === 'days_before_expiry' && typeof nc.days === 'number' && nc.days >= 1) {
            notificationConditionJson = JSON.stringify({ type: 'days_before_expiry', days: nc.days });
          } else {
            notificationConditionJson = null;
          }
        } else {
          notificationConditionJson = null;
        }
      }
      const [result] = await connection.execute(
        notificationConditionJson !== undefined
          ? `UPDATE telegram_bot_texts SET value = ?, buttons = ?, notification_condition = ?, updated_at = CURRENT_TIMESTAMP WHERE \`key\` = ?`
          : `UPDATE telegram_bot_texts SET value = ?, buttons = ?, updated_at = CURRENT_TIMESTAMP WHERE \`key\` = ?`,
        notificationConditionJson !== undefined
          ? [u.value, buttonsJson, notificationConditionJson, u.key]
          : [u.value, buttonsJson, u.key]
      );
      const affected = (result as any).affectedRows;
      if (affected === 0 && u.key === 'subscription_expiring_3_days') {
        const ncJson = notificationConditionJson ?? JSON.stringify({ type: 'days_before_expiry', days: 3 });
        await connection.execute(
          `INSERT INTO telegram_bot_texts (id, \`key\`, section, value, description, sort_order, buttons, notification_condition)
           VALUES (?, 'subscription_expiring_3_days', 'notifications', ?, ?, 10, ?, ?)
           ON DUPLICATE KEY UPDATE value = VALUES(value), buttons = VALUES(buttons), notification_condition = VALUES(notification_condition), updated_at = CURRENT_TIMESTAMP`,
          [crypto.randomUUID(), u.value, 'Уведомление: осталось 3 дня до конца подписки. Подстановки: {{endDate}}, {{daysLeft}}', buttonsJson, ncJson]
        );
      }
    }
    clearBotTextCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating telegram texts:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } finally {
    connection.release();
  }
}
