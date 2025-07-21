import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { 
  validateCookieSecurity, 
  detectSessionHijacking,
  validateSessionTokenStructure 
} from '@/lib/cookie-security';

/**
 * Security monitoring endpoint for real-time security checks
 */

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

    // Perform comprehensive security checks
    const securityResult = await validateCookieSecurity(req, {
      enableCSRFProtection: true,
      enableSessionRotation: true,
      enableCookieTamperingDetection: true,
      sessionRotationInterval: 120, // 2 hours
    });

    const hijackingCheck = detectSessionHijacking(req);
    
    // Get session token for structure validation
    const sessionCookie = req.cookies.get('next-auth.session-token');
    let tokenStructureValidation: { isValid: boolean; issues: string[] } = { isValid: true, issues: [] };
    
    if (sessionCookie) {
      tokenStructureValidation = validateSessionTokenStructure(sessionCookie.value);
    }

    // Create security report
    const securityReport = {
      timestamp: new Date().toISOString(),
      sessionId: token.sessionId,
      userId: token.id,
      cookieSecurity: {
        isValid: securityResult.isValid,
        shouldRotateSession: securityResult.shouldRotateSession,
        shouldClearCookies: securityResult.shouldClearCookies,
        reason: securityResult.reason,
        recommendations: securityResult.recommendations,
      },
      hijackingDetection: {
        isHijackingAttempt: hijackingCheck.isHijackingAttempt,
        riskLevel: hijackingCheck.riskLevel,
        indicators: hijackingCheck.indicators,
      },
      tokenValidation: {
        structureValid: tokenStructureValidation.isValid,
        structureIssues: tokenStructureValidation.issues,
      },
      requestMetadata: {
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || 
            req.headers.get('x-real-ip') || 
            'unknown',
        referer: req.headers.get('referer'),
        method: req.method,
        url: req.url,
      },
    };

    // Log security events for monitoring
    if (!securityResult.isValid || hijackingCheck.riskLevel === 'high') {
      console.error('High-risk security event detected:', securityReport);
    } else if (hijackingCheck.riskLevel === 'medium') {
      console.warn('Medium-risk security event detected:', securityReport);
    } else {
      console.info('Security check completed:', {
        sessionId: token.sessionId,
        userId: token.id,
        riskLevel: hijackingCheck.riskLevel,
      });
    }

    // Return security status
    return NextResponse.json({
      securityStatus: securityResult.isValid && hijackingCheck.riskLevel !== 'high' ? 'secure' : 'at_risk',
      riskLevel: hijackingCheck.riskLevel,
      recommendations: securityResult.recommendations,
      sessionRotationRequired: securityResult.shouldRotateSession,
      lastChecked: securityReport.timestamp,
    });

  } catch (error) {
    console.error('Security monitoring error:', error);
    return NextResponse.json(
      { error: 'Security check failed' },
      { status: 500 }
    );
  }
}

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

    // Return current security configuration
    return NextResponse.json({
      securityFeatures: {
        cookieSecurityValidation: true,
        sessionHijackingDetection: true,
        csrfProtection: true,
        sessionRotation: true,
        cookieTamperingDetection: true,
      },
      securitySettings: {
        sessionRotationInterval: 120, // minutes
        maxCookieAge: 24 * 60 * 60, // seconds
        secureTransmissionRequired: process.env.NODE_ENV === 'production',
      },
      sessionInfo: {
        sessionId: token.sessionId,
        userId: token.id,
        issuedAt: token.iat,
        expiresAt: token.exp,
      },
    });

  } catch (error) {
    console.error('Security status check error:', error);
    return NextResponse.json(
      { error: 'Security status check failed' },
      { status: 500 }
    );
  }
}