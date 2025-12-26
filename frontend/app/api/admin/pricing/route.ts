import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getConnection } from '../../../../lib/database';
import { PricingSettings, CreatePricingSettingsData, UpdatePricingSettingsData } from '../../../../types/pricing';

// OPTIONS /api/admin/pricing - CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.ALLOWED_ORIGIN || (origin && origin.includes('localhost') ? origin : '');
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin || 'null',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    }
  });
}

// GET /api/admin/pricing - получить настройки цен
export async function GET(request: NextRequest) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(`
      SELECT * FROM pricing_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No pricing settings found' }, { status: 404 });
    }

    const settings = rows[0] as any;
    
    const formattedSettings: PricingSettings = {
      id: settings.id,
      installationPrice: parseFloat(settings.installation_price),
      monthlyPricePerAccount: parseFloat(settings.monthly_price_per_account),
      discountMultipliers: typeof settings.discount_multipliers === 'string' 
        ? JSON.parse(settings.discount_multipliers) 
        : settings.discount_multipliers,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at
    };

    const origin = request.headers.get('origin');
    const allowedOrigin = process.env.ALLOWED_ORIGIN || (origin && origin.includes('localhost') ? origin : '');
    
    return NextResponse.json(formattedSettings, {
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin || 'null',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing settings' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST /api/admin/pricing - создать новые настройки цен
export async function POST(request: NextRequest) {
  // Проверка аутентификации администратора
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const data: CreatePricingSettingsData = await request.json();
  
  const connection = await getConnection();
  try {
    const settingsId = crypto.randomUUID();
    
    await connection.execute(`
      INSERT INTO pricing_settings (id, installation_price, monthly_price_per_account, discount_multipliers)
      VALUES (?, ?, ?, ?)
    `, [
      settingsId,
      data.installationPrice,
      data.monthlyPricePerAccount,
      JSON.stringify(data.discountMultipliers)
    ]);

    return NextResponse.json({ id: settingsId, message: 'Pricing settings created successfully' });
  } catch (error) {
    console.error('Error creating pricing settings:', error);
    return NextResponse.json({ error: 'Failed to create pricing settings' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT /api/admin/pricing - обновить настройки цен
export async function PUT(request: NextRequest) {
  // Проверка аутентификации администратора
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const data: UpdatePricingSettingsData = await request.json();
  
  const connection = await getConnection();
  try {
    // Получаем текущие настройки
    const [rows] = await connection.execute(`
      SELECT * FROM pricing_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No pricing settings found to update' }, { status: 404 });
    }

    const currentSettings = rows[0] as any;
    
    // Обновляем настройки
    await connection.execute(`
      UPDATE pricing_settings 
      SET installation_price = ?, 
          monthly_price_per_account = ?, 
          discount_multipliers = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.installationPrice,
      data.monthlyPricePerAccount,
      JSON.stringify(data.discountMultipliers),
      currentSettings.id
    ]);

    return NextResponse.json({ message: 'Pricing settings updated successfully' });
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    return NextResponse.json({ error: 'Failed to update pricing settings' }, { status: 500 });
  } finally {
    connection.release();
  }
}