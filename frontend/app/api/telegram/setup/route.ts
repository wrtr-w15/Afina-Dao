import { NextResponse } from 'next/server';
import { setupTelegramWebhook } from '@/lib/telegram';

export async function GET() {
  try {
    const success = await setupTelegramWebhook();
    
    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'Telegram webhook configured successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Failed to configure Telegram webhook' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

