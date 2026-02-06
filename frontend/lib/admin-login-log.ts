/**
 * Логирование входов в админку (IP, user-agent, успех/неудача, детали)
 */

import crypto from 'crypto';

const TABLE = 'admin_login_logs';

export type LoginLogEvent = 'success' | 'failure';
export type LoginLogDetails =
  | 'dev_mode'
  | 'telegram_approved'
  | 'invalid_password'
  | 'rate_limit'
  | 'request_created'
  | 'session_created'
  | string;

export async function ensureAdminLoginLogsTable(connection: any): Promise<void> {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id VARCHAR(36) PRIMARY KEY,
      ip VARCHAR(45) NOT NULL,
      user_agent VARCHAR(512) NULL,
      event VARCHAR(20) NOT NULL,
      details VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_at (created_at DESC),
      INDEX idx_event (event)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function insertAdminLoginLog(
  connection: any,
  params: { ip: string; userAgent?: string; event: LoginLogEvent; details?: LoginLogDetails }
): Promise<void> {
  try {
    await ensureAdminLoginLogsTable(connection);
    const id = crypto.randomUUID();
    const userAgent = (params.userAgent || '').slice(0, 512);
    await connection.execute(
      `INSERT INTO ${TABLE} (id, ip, user_agent, event, details) VALUES (?, ?, ?, ?, ?)`,
      [id, params.ip, userAgent || null, params.event, params.details || null]
    );
  } catch (e) {
    console.error('Failed to insert admin login log:', e);
  }
}
