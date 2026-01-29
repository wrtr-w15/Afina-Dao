// Тестовый endpoint для локальной разработки без webhook
import { NextRequest, NextResponse } from 'next/server';
import { processUpdate } from '@/lib/telegram-bot';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const command = searchParams.get('command') || '/start';
  const userId = parseInt(searchParams.get('user_id') || '594604749');
  const username = searchParams.get('username') || 'test_user';
  
  const fakeUpdate = {
    update_id: Date.now(),
    message: {
      message_id: Date.now(),
      from: { id: userId, is_bot: false, first_name: 'Test', username },
      chat: { id: userId, type: 'private', first_name: 'Test', username },
      date: Math.floor(Date.now() / 1000),
      text: command
    }
  };

  try {
    await processUpdate(fakeUpdate);
    return NextResponse.json({ success: true, message: `Sent: ${command}`, userId });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { callback_data, user_id = 594604749, username = 'test_user' } = await request.json();
  
  if (!callback_data) {
    return NextResponse.json({ error: 'callback_data required' }, { status: 400 });
  }
  
  const fakeUpdate = {
    update_id: Date.now(),
    callback_query: {
      id: String(Date.now()),
      from: { id: user_id, is_bot: false, first_name: 'Test', username },
      message: {
        message_id: Date.now() - 1,
        from: { id: 8444842274, is_bot: true, first_name: 'AfinaDAO', username: 'afinadao_pay_bot' },
        chat: { id: user_id, type: 'private', first_name: 'Test', username },
        date: Math.floor(Date.now() / 1000) - 10,
        text: 'Previous message'
      },
      chat_instance: String(Date.now()),
      data: callback_data
    }
  };

  try {
    await processUpdate(fakeUpdate);
    return NextResponse.json({ success: true, message: `Sent callback: ${callback_data}` });
  } catch (error) {
    console.error('Test callback error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
