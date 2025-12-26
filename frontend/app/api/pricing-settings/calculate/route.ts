import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '../../../../lib/database';
import { PricingCalculation } from '../../../../types/pricing';

// GET /api/pricing-settings/calculate?projects=5 - рассчитать цену для определенного количества проектов
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectCount = parseInt(searchParams.get('projects') || '1');
  
  if (isNaN(projectCount) || projectCount < 1) {
    return NextResponse.json({ error: 'Invalid project count' }, { status: 400 });
  }

  const connection = await getConnection();
  try {
      // Получаем текущие настройки цен
      const [rows] = await connection.execute(`
        SELECT * FROM pricing_settings 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'No pricing settings found' }, { status: 404 });
      }

      const settings = rows[0] as any;
      const discountMultipliers = typeof settings.discount_multipliers === 'string'
        ? JSON.parse(settings.discount_multipliers)
        : settings.discount_multipliers;
      
      // Определяем множитель скидки
      let discountMultiplier = 1.0;
      if (projectCount <= 10) {
        discountMultiplier = discountMultipliers[projectCount.toString()] || 1.0;
      } else {
        // Для более чем 10 проектов используем скидку для 10 проектов
        discountMultiplier = discountMultipliers['10'] || 1.0;
      }
      
      const basePrice = parseFloat(settings.monthly_price_per_account);
      const discountedPrice = basePrice * discountMultiplier;
      const totalPrice = discountedPrice * projectCount;

      const calculation: PricingCalculation = {
        projectCount,
        basePrice,
        discountMultiplier,
        discountedPrice,
        totalPrice
      };

    return NextResponse.json(calculation);
  } catch (error) {
    console.error('Error calculating pricing:', error);
    return NextResponse.json({ error: 'Failed to calculate pricing' }, { status: 500 });
  } finally {
    connection.release();
  }
}
