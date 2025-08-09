import { NextRequest, NextResponse } from 'next/server';
import { generateSessionFingerprint } from './session-utils';
import { PrismaClient } from '@prisma/client';

/**
 * Cookie security utilities for enhanced session protection
 */

export interface CookieSecurityOptions {
  enableCSRFProtection?: boolean;
  enableSessionRotation?: boolean;
  enableCookieTamperingDetection?: boolean;
  sessionRotationInterval?: number; // in minutes
  maxCookieAge?: number; // in seconds
}

export interface SecurityValidationResult {
  isValid: boolean;
  shouldRotateSession: boolean;
  shouldClearCookies: boolean;
  reason?: string;
  recommendations?: string[];
}

/**
 * Validate cookie security and integrity
 */
export async function validateCookieSecurity(
  req: NextRequest,
  options: CookieSecurityOptions = {}
): Promise<SecurityValidationResult> {
  const {
    enableCSRFProtection = true,
    enableSessionRotation = true,
    enableCookieTamperingDetection = true,
    sessionRotationInterval = 120, // 2 hours
  } = options;

  const result: SecurityValidationResult = {
    isValid: true,
    shouldRotateSession: false,
    shouldClearCookies: false,
    recommendations: []
  };

  try {
    // Get Better Auth session token for validation
    const sessionCookie = req.cookies.get('better-auth.session_token') || req.cookies.get('better-auth.session-token');
    
    if (!sessionCookie) {
      return {
        isValid: false,
        shouldRotateSession: false,
        shouldClearCookies: true,
        reason: 'No valid session token found'
      };
    }

    // Check for suspicious cookie patterns first, before database validation
    if (enableCookieTamperingDetection) {
      const suspiciousPatterns = [
        /[<>]/, // HTML tags
        /javascript:/i, // JS injection
        /data:/i, // Data URLs
        /vbscript:/i, // VBScript
      ];
      
      const cookieValue = sessionCookie.value;
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(cookieValue)) {
          return {
            isValid: false,
            shouldRotateSession: false,
            shouldClearCookies: true,
            reason: 'Suspicious cookie content detected'
          };
        }
      }
    }

    // Check for secure transmission first (before expensive database operations)
    if (process.env.NODE_ENV === 'production') {
      // Enhanced HTTPS detection including Cloudflare tunnel headers
      const cfVisitor = req.headers.get('cf-visitor');
      const isSecure = req.url.startsWith('https://') || 
                      req.headers.get('x-forwarded-proto') === 'https' ||
                      req.headers.get('x-forwarded-ssl') === 'on' ||
                      req.headers.get('x-original-proto') === 'https' ||
                      (cfVisitor && cfVisitor.includes('"scheme":"https"'));
      
      // Debug logging for Cloudflare tunnel troubleshooting
      if (!isSecure) {
        console.log('🔍 HTTPS Detection Debug:', {
          url: req.url,
          nextauthUrl: process.env.NEXTAUTH_URL,
          headers: {
            'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
            'x-forwarded-ssl': req.headers.get('x-forwarded-ssl'),
            'x-original-proto': req.headers.get('x-original-proto'),
            'cf-visitor': req.headers.get('cf-visitor'),
            'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
            'cf-ray': req.headers.get('cf-ray'),
            'host': req.headers.get('host'),
            'x-forwarded-host': req.headers.get('x-forwarded-host'),
            'x-forwarded-for': req.headers.get('x-forwarded-for')
          },
          environment: process.env.NODE_ENV
        });
      }
      
      if (!isSecure) {
        return {
          isValid: false,
          shouldRotateSession: false,
          shouldClearCookies: true,
          reason: 'Insecure transmission in production environment'
        };
      }
    }

    // Better Auth signs the session token - extract just the session ID part
    // Format: sessionId.signature
    const sessionToken = decodeURIComponent(sessionCookie.value).split('.')[0];

    // Validate session against the database using Better Auth's session table
    const prisma = new PrismaClient();
    let session, user;
    
    try {
      // Look up the session in the database using the session token
      session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true }
      });

      if (!session) {
        await prisma.$disconnect();
        return {
          isValid: false,
          shouldRotateSession: false,
          shouldClearCookies: true,
          reason: 'Invalid session token'
        };
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        await prisma.$disconnect();
        return {
          isValid: false,
          shouldRotateSession: false,
          shouldClearCookies: true,
          reason: 'Session expired'
        };
      }

      user = session.user;

    } catch (error) {
      console.error('Database error during cookie security validation:', error);
      await prisma.$disconnect();
      return {
        isValid: false,
        shouldRotateSession: false,
        shouldClearCookies: true,
        reason: 'Database validation error'
      };
    } finally {
      await prisma.$disconnect();
    }

    // SECURITY FIX: Session fingerprinting validation for Better Auth
    // Better Auth doesn't store fingerprints in tokens, so we generate and log for monitoring
    try {
      // Generate current session fingerprint
      const currentFingerprint = await generateSessionFingerprint(req);
      
      // Log fingerprint for security monitoring (skip in tests)
      if (process.env.NODE_ENV !== 'test' && typeof jest === 'undefined') {
        console.log('🔒 Session fingerprint for Better Auth session:', {
          sessionId: session.id,
          userId: user.id,
          ipHash: currentFingerprint.ipHash,
          userAgentHash: currentFingerprint.userAgentHash
        });
      }
      
      // Note: Better Auth handles session validation at the database level
      // We can enhance this later by storing fingerprints in a separate table if needed
      
    } catch (error) {
      console.error('❌ Session fingerprinting failed:', error);
      result.recommendations?.push('Session fingerprinting validation failed');
    }

    // Check session age for session rotation
    if (enableSessionRotation && session.createdAt) {
      const sessionAge = Date.now() / 1000 - (session.createdAt.getTime() / 1000);
      const rotationThreshold = sessionRotationInterval * 60;
      
      if (sessionAge > rotationThreshold) {
        result.shouldRotateSession = true;
        result.recommendations?.push('Session should be rotated due to age');
      }
    }

    // Validate cookie length for tampering detection
    if (enableCookieTamperingDetection) {
      const betterAuthCookie = req.cookies.get('better-auth.session_token') || req.cookies.get('better-auth.session-token');
      
      if (betterAuthCookie) {
        const cookieValue = betterAuthCookie.value;
        
        // Check cookie length (Better Auth session tokens have expected ranges)
        // Better Auth tokens are typically shorter than JWT tokens
        if (cookieValue.length < 50 || cookieValue.length > 1024) {
          result.recommendations?.push('Cookie length is outside expected range');
        }
      }
    }

    // CSRF protection validation
    if (enableCSRFProtection && req.method !== 'GET') {
      // Better Auth doesn't use CSRF tokens in the same way as NextAuth
      // Instead, it relies on SameSite cookies and other security measures
      const csrfToken = req.headers.get('x-csrf-token');
      
      if (!csrfToken) {
        result.recommendations?.push('CSRF token missing for non-GET request - consider adding custom CSRF protection');
      }
    }


    return result;
  } catch (error) {
    console.error('Cookie security validation error:', error);
    return {
      isValid: false,
      shouldRotateSession: false,
      shouldClearCookies: true,
      reason: 'Security validation failed'
    };
  }
}

/**
 * Create secure cookie headers with enhanced security options
 */
export function createSecureCookieHeaders(options: {
  name: string;
  value: string;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}): string {
  const {
    name,
    value,
    maxAge = 24 * 60 * 60, // 24 hours default
    domain,
    path = '/',
    secure = process.env.NODE_ENV === 'production',
    httpOnly = true,
    sameSite = 'strict'
  } = options;

  let cookieString = `${name}=${value}`;
  
  if (maxAge) {
    cookieString += `; Max-Age=${maxAge}`;
    cookieString += `; Expires=${new Date(Date.now() + maxAge * 1000).toUTCString()}`;
  }
  
  if (domain) {
    cookieString += `; Domain=${domain}`;
  }
  
  cookieString += `; Path=${path}`;
  
  if (secure) {
    cookieString += '; Secure';
  }
  
  if (httpOnly) {
    cookieString += '; HttpOnly';
  }
  
  cookieString += `; SameSite=${sameSite}`;
  
  return cookieString;
}

/**
 * Clear all authentication-related cookies
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  const authCookies = [
    // Better Auth cookies
    'better-auth.session_token',
    'better-auth.session-token',
    'better-auth.csrf',
    // Legacy NextAuth cookies (for cleanup)
    'next-auth.session-token',
    'next-auth.callback-url',
    'next-auth.csrf-token',
    'next-auth.pkce.code_verifier',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.csrf-token'
  ];

  authCookies.forEach(cookieName => {
    response.cookies.set({
      name: cookieName,
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  });

  return response;
}

/**
 * Detect session hijacking attempts
 */
export function detectSessionHijacking(req: NextRequest): {
  isHijackingAttempt: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  indicators: string[];
} {
  const indicators: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Check for multiple session tokens
  const sessionCookies = req.cookies.getAll().filter(cookie => 
    cookie.name.includes('session') || cookie.name.includes('auth')
  );
  
  if (sessionCookies.length > 3) {
    indicators.push('Multiple session cookies detected');
    riskLevel = 'medium';
  }

  // Check for suspicious user agent changes
  const userAgent = req.headers.get('user-agent');
  if (!userAgent || userAgent.length < 20) {
    indicators.push('Suspicious or missing User-Agent header');
    riskLevel = 'medium';
  }

  // Check for rapid IP changes (would need session storage for full implementation)
  const forwardedFor = req.headers.get('x-forwarded-for');
  
  // Be more lenient with IP checks in development (localhost often has proxy chains)
  const maxIPCount = isDevelopment ? 5 : 3;
  if (forwardedFor && forwardedFor.split(',').length > maxIPCount) {
    indicators.push('Multiple forwarded IP addresses');
    riskLevel = 'high';
  }

  // Check for suspicious headers (with environment-aware detection)
  const suspiciousHeaders = ['x-original-url', 'x-rewrite-url'];
  
  // Note: x-forwarded-host header is allowed in all environments
  // as reverse proxies commonly use this header for legitimate routing
  
  for (const header of suspiciousHeaders) {
    if (req.headers.get(header)) {
      indicators.push(`Suspicious header detected: ${header}`);
      riskLevel = 'high';
    }
  }

  return {
    isHijackingAttempt: indicators.length > 0,
    riskLevel,
    indicators
  };
}

/**
 * Generate secure session identifier
 */
export function generateSecureSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate session token structure and integrity
 */
export function validateSessionTokenStructure(token: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Better Auth tokens have a different structure: sessionId.signature
  const parts = token.split('.');
  if (parts.length !== 2) {
    issues.push('Token does not have valid Better Auth structure (sessionId.signature)');
  }

  // Check for minimum length (Better Auth tokens are shorter than JWT)
  if (token.length < 50) {
    issues.push('Token is suspiciously short');
  }

  // Check for maximum length (prevent DoS)
  if (token.length > 1024) {
    issues.push('Token is suspiciously long');
  }

  // Check for valid characters (Better Auth uses base64url for signatures)
  const validChars = /^[A-Za-z0-9_-]+$/;
  for (const part of parts) {
    if (!validChars.test(part)) {
      issues.push('Token contains invalid characters');
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}