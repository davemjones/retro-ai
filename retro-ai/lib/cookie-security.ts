import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
    // Get JWT token for validation
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return {
        isValid: false,
        shouldRotateSession: false,
        shouldClearCookies: true,
        reason: 'No valid session token found'
      };
    }

    // Check token age for session rotation
    if (enableSessionRotation && token.iat) {
      const tokenAge = Date.now() / 1000 - (token.iat as number);
      const rotationThreshold = sessionRotationInterval * 60;
      
      if (tokenAge > rotationThreshold) {
        result.shouldRotateSession = true;
        result.recommendations?.push('Session should be rotated due to age');
      }
    }

    // Validate cookie headers for tampering
    if (enableCookieTamperingDetection) {
      const sessionCookie = req.cookies.get('next-auth.session-token');
      
      if (sessionCookie) {
        // Check for suspicious cookie patterns
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
        
        // Check cookie length (JWT tokens have expected ranges)
        if (cookieValue.length < 100 || cookieValue.length > 2048) {
          result.recommendations?.push('Cookie length is outside expected range');
        }
      }
    }

    // CSRF protection validation
    if (enableCSRFProtection && req.method !== 'GET') {
      const csrfToken = req.headers.get('x-csrf-token') || 
                       req.cookies.get('next-auth.csrf-token')?.value;
      
      if (!csrfToken) {
        result.recommendations?.push('CSRF token missing for non-GET request');
      }
    }

    // Check for secure transmission
    if (process.env.NODE_ENV === 'production') {
      if (!req.url.startsWith('https://')) {
        return {
          isValid: false,
          shouldRotateSession: false,
          shouldClearCookies: true,
          reason: 'Insecure transmission in production environment'
        };
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
  
  // Only treat x-forwarded-host as suspicious in production environments
  if (!isDevelopment) {
    suspiciousHeaders.push('x-forwarded-host');
  }
  
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

  // Check if it looks like a JWT
  const parts = token.split('.');
  if (parts.length !== 3) {
    issues.push('Token does not have valid JWT structure (header.payload.signature)');
  }

  // Check for minimum length
  if (token.length < 100) {
    issues.push('Token is suspiciously short');
  }

  // Check for maximum length (prevent DoS)
  if (token.length > 4096) {
    issues.push('Token is suspiciously long');
  }

  // Check for valid characters (JWT uses base64url)
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