import { NextRequest, NextResponse } from 'next/server';
import { triggerScheduler, startScheduler, stopScheduler } from '@/lib/scheduler';

// POST /api/scheduler - запустить scheduler вручную или управлять им
export async function POST(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'run';

  try {
    switch (action) {
      case 'run':
        const result = await triggerScheduler();
        return NextResponse.json(result);

      case 'start':
        const intervalMinutes = parseInt(searchParams.get('interval') || '60');
        startScheduler(intervalMinutes * 60 * 1000);
        return NextResponse.json({ 
          success: true, 
          message: `Scheduler started with ${intervalMinutes} minute interval` 
        });

      case 'stop':
        stopScheduler();
        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler stopped' 
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: run, start, stop' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in scheduler endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/scheduler - статус scheduler
export async function GET(request: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/security-middleware');
  const authResult = await checkAdminAuth(request);
  if (authResult) return authResult;

  return NextResponse.json({
    endpoints: {
      'POST': 'Run scheduler once',
      'POST?action=run': 'Run scheduler once',
      'POST?action=start': 'Start scheduler (default: 60 min interval)',
      'POST?action=start&interval=30': 'Start scheduler with 30 min interval',
      'POST?action=stop': 'Stop scheduler'
    }
  });
}
