import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { generateSecureSessionId } from '@/lib/cookie-security';

/**
 * CSRF token generation and validation endpoint
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

    // Generate CSRF token
    const csrfToken = generateSecureSessionId();
    
    // Create response with CSRF token
    const response = NextResponse.json({
      csrfToken,
      sessionId: token.sessionId,
    });

    // Set CSRF token as httpOnly cookie
    response.cookies.set({
      name: 'csrf-token',
      value: csrfToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
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
    const { csrfToken: providedToken } = body;

    // Get CSRF token from cookie
    const csrfCookie = req.cookies.get('csrf-token');
    
    if (!csrfCookie || !providedToken) {
      return NextResponse.json(
        { error: 'CSRF token missing' },
        { status: 400 }
      );
    }

    // Validate CSRF token
    if (csrfCookie.value !== providedToken) {
      console.warn('CSRF token validation failed:', {
        expected: csrfCookie.value,
        provided: providedToken,
        sessionId: token.sessionId,
        userAgent: req.headers.get('user-agent')
      });
      
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      sessionId: token.sessionId,
    });
  } catch (error) {
    console.error('CSRF token validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}