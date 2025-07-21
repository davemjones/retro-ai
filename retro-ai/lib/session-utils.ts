import { NextRequest } from 'next/server';

/**
 * Session fingerprinting utilities to prevent session bleeding across browser tabs
 */

export interface SessionFingerprint {
  ipHash: string;
  userAgentHash: string;
  timestamp: number;
}

/**
 * Generate a session fingerprint based on request headers
 */
export async function generateSessionFingerprint(req: NextRequest): Promise<SessionFingerprint> {
  // Get client IP address (handle various proxy headers)
  const clientIP = 
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';

  // Get user agent
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Create hashes for privacy (don't store raw values)
  const ipData = new TextEncoder().encode(clientIP + (process.env.NEXTAUTH_SECRET || ''));
  const userAgentData = new TextEncoder().encode(userAgent + (process.env.NEXTAUTH_SECRET || ''));
  
  const ipHashBuffer = await crypto.subtle.digest('SHA-256', ipData);
  const userAgentHashBuffer = await crypto.subtle.digest('SHA-256', userAgentData);
  
  const ipHash = Array.from(new Uint8Array(ipHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16); // Truncate for storage efficiency

  const userAgentHash = Array.from(new Uint8Array(userAgentHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);

  return {
    ipHash,
    userAgentHash,
    timestamp: Date.now(),
  };
}

/**
 * Generate fingerprint from server-side request (for API routes)
 */
export async function generateServerFingerprint(headers: Headers): Promise<SessionFingerprint> {
  const clientIP = 
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown';

  const userAgent = headers.get('user-agent') || 'unknown';

  const ipData = new TextEncoder().encode(clientIP + (process.env.NEXTAUTH_SECRET || ''));
  const userAgentData = new TextEncoder().encode(userAgent + (process.env.NEXTAUTH_SECRET || ''));
  
  const ipHashBuffer = await crypto.subtle.digest('SHA-256', ipData);
  const userAgentHashBuffer = await crypto.subtle.digest('SHA-256', userAgentData);
  
  const ipHash = Array.from(new Uint8Array(ipHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);

  const userAgentHash = Array.from(new Uint8Array(userAgentHashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);

  return {
    ipHash,
    userAgentHash,
    timestamp: Date.now(),
  };
}

/**
 * Validate if a session fingerprint matches the current request
 */
export function validateSessionFingerprint(
  storedFingerprint: SessionFingerprint,
  currentFingerprint: SessionFingerprint,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours default
): { isValid: boolean; reason?: string } {
  // Check if fingerprint is too old
  if (Date.now() - storedFingerprint.timestamp > maxAge) {
    return { isValid: false, reason: 'Fingerprint expired' };
  }

  // Check IP hash match (strict)
  if (storedFingerprint.ipHash !== currentFingerprint.ipHash) {
    return { isValid: false, reason: 'IP address mismatch' };
  }

  // Check User-Agent hash match (strict)
  if (storedFingerprint.userAgentHash !== currentFingerprint.userAgentHash) {
    return { isValid: false, reason: 'User agent mismatch' };
  }

  return { isValid: true };
}

/**
 * Check if current session is potentially hijacked
 */
export function detectSessionAnomaly(
  sessionHistory: SessionFingerprint[],
  currentFingerprint: SessionFingerprint
): { isAnomalous: boolean; risk: 'low' | 'medium' | 'high'; reasons: string[] } {
  const reasons: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (sessionHistory.length === 0) {
    return { isAnomalous: false, risk: 'low', reasons: [] };
  }

  const lastFingerprint = sessionHistory[sessionHistory.length - 1];
  
  // Check for IP changes
  if (lastFingerprint.ipHash !== currentFingerprint.ipHash) {
    reasons.push('IP address changed');
    riskLevel = 'medium';
  }

  // Check for user agent changes  
  if (lastFingerprint.userAgentHash !== currentFingerprint.userAgentHash) {
    reasons.push('User agent changed');
    riskLevel = 'medium';
  }

  // Check for rapid location changes (if both IP and UA change quickly)
  const timeDiff = currentFingerprint.timestamp - lastFingerprint.timestamp;
  if (reasons.length >= 2 && timeDiff < 5 * 60 * 1000) { // 5 minutes
    reasons.push('Rapid environment change detected');
    riskLevel = 'high';
  }

  return {
    isAnomalous: reasons.length > 0,
    risk: riskLevel,
    reasons,
  };
}

/**
 * Generate a unique session ID for tab isolation
 */
export function generateTabSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate session consistency across requests
 */
export function validateSessionConsistency(
  sessionData: { user?: { id?: string }; fingerprint?: SessionFingerprint } | null,
  fingerprint: SessionFingerprint
): { isValid: boolean; shouldRefresh: boolean; error?: string } {
  if (!sessionData) {
    return { isValid: false, shouldRefresh: true, error: 'No session data' };
  }

  if (!sessionData.user?.id) {
    return { isValid: false, shouldRefresh: true, error: 'Invalid user data' };
  }

  // Check if session has required fingerprint data
  if (!sessionData.fingerprint) {
    return { isValid: true, shouldRefresh: true, error: 'Missing fingerprint - needs refresh' };
  }

  // Validate fingerprint
  const validation = validateSessionFingerprint(sessionData.fingerprint, fingerprint);
  
  if (!validation.isValid) {
    return { 
      isValid: false, 
      shouldRefresh: false, 
      error: `Session validation failed: ${validation.reason}` 
    };
  }

  return { isValid: true, shouldRefresh: false };
}