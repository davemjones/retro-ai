import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth-better';
import { SessionManager } from '@/lib/session-manager';

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user?.id || !session?.session?.id) {
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
      session.session.id,
      req,
      action
    );

    // Log activity if resource is provided
    if (resource) {
      try {
        await SessionManager.logActivity(
          session.session.id,
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
      } catch (logError) {
        console.warn('Failed to log detailed activity:', logError);
        // Don't fail the request if logging fails
      }
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