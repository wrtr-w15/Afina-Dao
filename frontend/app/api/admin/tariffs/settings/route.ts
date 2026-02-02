import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';

const ROW_ID = 'default';

async function ensureTable(connection: any): Promise<void> {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS subscription_tariff_settings (
      id VARCHAR(36) PRIMARY KEY,
      days_after_expiry_switch INT NOT NULL DEFAULT 5,
      actual_tariff_id VARCHAR(36) NULL,
      use_all_active_tariffs TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_actual_tariff (actual_tariff_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    const [col] = await connection.execute(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_tariff_settings' AND COLUMN_NAME = 'use_all_active_tariffs'
    `);
    if ((col as any[]).length === 0) {
      await connection.execute(`ALTER TABLE subscription_tariff_settings ADD COLUMN use_all_active_tariffs TINYINT(1) NOT NULL DEFAULT 0`);
    }
  } catch (_) {}
  const [rows] = await connection.execute('SELECT id FROM subscription_tariff_settings WHERE id = ?', [ROW_ID]);
  if ((rows as any[]).length === 0) {
    await connection.execute(
      'INSERT INTO subscription_tariff_settings (id, days_after_expiry_switch) VALUES (?, 5)',
      [ROW_ID]
    );
  }
}

// GET /api/admin/tariffs/settings
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const connection = await getConnection();
  try {
    await ensureTable(connection);
    const [rows] = await connection.execute(
      'SELECT days_after_expiry_switch AS days, actual_tariff_id AS tariffId, use_all_active_tariffs AS useAll FROM subscription_tariff_settings WHERE id = ?',
      [ROW_ID]
    );
    const row = (rows as any[])[0];
    return NextResponse.json({
      daysAfterExpirySwitch: row ? Number(row.days) || 5 : 5,
      actualTariffId: row?.tariffId ?? null,
      useAllActiveTariffs: Boolean(row?.useAll)
    });
  } catch (error) {
    console.error('Error fetching tariff settings:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/admin/tariffs/settings
export async function PUT(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  let body: { daysAfterExpirySwitch?: number; actualTariffId?: string | null; useAllActiveTariffs?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const days = body.daysAfterExpirySwitch != null ? Math.max(0, Math.min(365, Number(body.daysAfterExpirySwitch) || 0)) : undefined;
  const actualTariffId = body.actualTariffId === null || body.actualTariffId === '' ? null : (body.actualTariffId && String(body.actualTariffId).trim()) || undefined;
  const useAllActiveTariffs = body.useAllActiveTariffs !== undefined ? (body.useAllActiveTariffs ? 1 : 0) : undefined;

  const connection = await getConnection();
  try {
    await ensureTable(connection);
    const updates: string[] = [];
    const params: any[] = [];
    if (days !== undefined) {
      updates.push('days_after_expiry_switch = ?');
      params.push(days);
    }
    if (actualTariffId !== undefined) {
      updates.push('actual_tariff_id = ?');
      params.push(actualTariffId);
    }
    if (useAllActiveTariffs !== undefined) {
      updates.push('use_all_active_tariffs = ?');
      params.push(useAllActiveTariffs);
    }
    if (updates.length > 0) {
      params.push(ROW_ID);
      await connection.execute(
        `UPDATE subscription_tariff_settings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );
    }
    const [rows] = await connection.execute(
      'SELECT days_after_expiry_switch AS days, actual_tariff_id AS tariffId, use_all_active_tariffs AS useAll FROM subscription_tariff_settings WHERE id = ?',
      [ROW_ID]
    );
    const row = (rows as any[])[0];
    return NextResponse.json({
      daysAfterExpirySwitch: row ? Number(row.days) || 5 : 5,
      actualTariffId: row?.tariffId ?? null,
      useAllActiveTariffs: Boolean(row?.useAll)
    });
  } catch (error) {
    console.error('Error updating tariff settings:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } finally {
    connection.release();
  }
}
