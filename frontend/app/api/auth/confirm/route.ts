import { NextRequest, NextResponse } from 'next/server';
import { getConfirmationStatus, deleteConfirmationStatus, isConfirmationExpired } from '../../../../lib/global-auth';

// Функция для установки статуса подтверждения (перенаправляем в глобальное хранилище)
export function setConfirmationStatus(requestId: string, approved: boolean): void {
  const { setConfirmationStatus: globalSetConfirmation } = require('../../../../lib/global-auth');
  globalSetConfirmation(requestId, approved);
}

// POST /api/auth/confirm - установка статуса подтверждения
export async function POST(request: NextRequest) {
  try {
    const { requestId, approved } = await request.json();
    
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    confirmations.set(requestId, {
      timestamp: Date.now(),
      approved
    });

    console.log(`Confirmation set: ${requestId} - ${approved ? 'approved' : 'denied'}`);

    return NextResponse.json({ 
      success: true,
      message: 'Confirmation status updated'
    });
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/auth/confirm - получение статуса подтверждения
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    const confirmation = getConfirmationStatus(requestId);
    
    if (!confirmation) {
      return NextResponse.json({ 
        status: 'pending',
        message: 'Waiting for confirmation...'
      });
    }

    // Проверяем, не истек ли запрос (5 минут)
    if (isConfirmationExpired(confirmation.timestamp)) {
      deleteConfirmationStatus(requestId);
      return NextResponse.json({ error: 'Request expired' }, { status: 410 });
    }

    if (confirmation.approved) {
      // Удаляем подтверждение после использования
      deleteConfirmationStatus(requestId);
      return NextResponse.json({ 
        success: true,
        message: 'Access approved'
      });
    } else {
      deleteConfirmationStatus(requestId);
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