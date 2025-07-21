import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session-manager';

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { action = 'activity', resource } = body;

    // Update session activity
    await SessionManager.updateSessionActivity(
      session.sessionId as string,
      req,
      action
    );

    // Log activity if resource is provided
    if (resource) {
      await SessionManager.logActivity(
        session.sessionId as string,
        {
          action,
          resource,
          metadata: {
            userAgent: req.headers.get('user-agent'),
            timestamp: Date.now(),
          },
        },
        req
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session activity tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track activity' },
      { status: 500 }
    );
  }
}