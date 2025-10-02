import { NextRequest, NextResponse } from 'next/server';
import { getGlobalConfirmation, deleteGlobalConfirmation } from '../telegram/webhook/route';

// GET метод для проверки статуса
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    const confirmation = getGlobalConfirmation(requestId);
    
    if (!confirmation) {
      return NextResponse.json({ 
        status: 'pending',
        message: 'Waiting for confirmation...'
      });
    }

    // Проверяем, не истек ли запрос (5 минут)
    if (Date.now() - confirmation.timestamp > 5 * 60 * 1000) {
      deleteGlobalConfirmation(requestId);
      return NextResponse.json({ error: 'Request expired' }, { status: 410 });
    }

    if (confirmation.approved) {
      // Удаляем подтверждение после использования
      deleteGlobalConfirmation(requestId);
      return NextResponse.json({ 
        success: true,
        message: 'Access approved'
      });
    } else {
      deleteGlobalConfirmation(requestId);
      return NextResponse.json({ 
        success: false,
        message: 'Access denied'
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

