import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session-manager';

/**
 * Session cleanup API endpoint - for scheduled maintenance
 */

export async function POST(req: NextRequest) {
  try {
    // Simple authentication for cleanup endpoint
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_KEY || 'default-cleanup-key';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Perform session cleanup
    const cleanedCount = await SessionManager.cleanupExpiredSessions();
    
    return NextResponse.json({
      message: 'Session cleanup completed',
      cleanedSessions: cleanedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}