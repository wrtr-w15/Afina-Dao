import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { dbConfig } from '../../../../lib/database';
import { PricingSettings, CreatePricingSettingsData, UpdatePricingSettingsData } from '../../../../types/pricing';

// OPTIONS /api/admin/pricing - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

// GET /api/admin/pricing - получить настройки цен
export async function GET() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT * FROM pricing_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    await connection.end();

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

    return NextResponse.json(formattedSettings, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing settings' }, { status: 500 });
  }
}

// POST /api/admin/pricing - создать новые настройки цен
export async function POST(request: NextRequest) {
  try {
    const data: CreatePricingSettingsData = await request.json();
    
    const connection = await mysql.createConnection(dbConfig);
    
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

    await connection.end();

    return NextResponse.json({ id: settingsId, message: 'Pricing settings created successfully' });
  } catch (error) {
    console.error('Error creating pricing settings:', error);
    return NextResponse.json({ error: 'Failed to create pricing settings' }, { status: 500 });
  }
}

// PUT /api/admin/pricing - обновить настройки цен
export async function PUT(request: NextRequest) {
  try {
    const data: UpdatePricingSettingsData = await request.json();
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Получаем текущие настройки
    const [rows] = await connection.execute(`
      SELECT * FROM pricing_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.end();
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

    await connection.end();

    return NextResponse.json({ message: 'Pricing settings updated successfully' });
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    return NextResponse.json({ error: 'Failed to update pricing settings' }, { status: 500 });
  }
}