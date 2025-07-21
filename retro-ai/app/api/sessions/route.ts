import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SessionManager } from '@/lib/session-manager';

/**
 * Session management API endpoints
 */

export async function GET(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = token.id as string;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'list':
        // Get all active sessions for the user
        const sessions = await SessionManager.getUserSessions(userId);
        return NextResponse.json({ sessions });

      case 'analytics':
        // Get session analytics
        const days = parseInt(url.searchParams.get('days') || '30');
        const analytics = await SessionManager.getSessionAnalytics(userId, days);
        return NextResponse.json({ analytics });

      case 'current':
        // Get current session info
        const sessionId = token.sessionId as string;
        const validation = await SessionManager.validateSession(sessionId);
        return NextResponse.json({ 
          currentSession: validation.session,
          isValid: validation.isValid 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, sessionId } = body;
    const userId = token.id as string;
    const currentSessionId = token.sessionId as string;

    switch (action) {
      case 'create':
        // Create a new session (called after login)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await SessionManager.createSession(userId, currentSessionId, req, expiresAt);
        
        return NextResponse.json({ 
          message: 'Session created successfully',
          sessionId: currentSessionId 
        });

      case 'terminate':
        // Terminate a specific session
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Session ID required' },
            { status: 400 }
          );
        }

        const terminated = await SessionManager.terminateSession(sessionId, 'user_request');
        
        if (terminated) {
          return NextResponse.json({ message: 'Session terminated successfully' });
        } else {
          return NextResponse.json(
            { error: 'Failed to terminate session' },
            { status: 400 }
          );
        }

      case 'terminate_others':
        // Terminate all other sessions except current
        const count = await SessionManager.terminateOtherSessions(userId, currentSessionId);
        
        return NextResponse.json({ 
          message: `${count} other sessions terminated`,
          terminatedCount: count 
        });

      case 'activity':
        // Log activity for current session
        const { activityAction, resource, duration, metadata } = body;
        
        await SessionManager.updateSessionActivity(currentSessionId, req, activityAction);
        
        if (resource || duration || metadata) {
          await SessionManager.logActivity(currentSessionId, {
            action: activityAction || 'custom_activity',
            resource,
            duration,
            metadata
          }, req);
        }

        return NextResponse.json({ message: 'Activity logged' });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Sessions API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Verify user is authenticated
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const terminated = await SessionManager.terminateSession(sessionId, 'user_delete');
    
    if (terminated) {
      return NextResponse.json({ message: 'Session deleted successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Sessions API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}