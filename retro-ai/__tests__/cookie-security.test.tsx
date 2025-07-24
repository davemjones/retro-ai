import {
  validateCookieSecurity,
  createSecureCookieHeaders,
  clearAuthCookies,
  detectSessionHijacking,
  generateSecureSessionId,
  validateSessionTokenStructure
} from '@/lib/cookie-security';
import { NextRequest, NextResponse } from 'next/server';

// Mock environment variable
process.env.NEXTAUTH_SECRET = 'test-secret-key';

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}));

const mockGetToken = require('next-auth/jwt').getToken;

describe('Cookie Security Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCookieSecurity', () => {
    it('should return invalid for missing token', async () => {
      mockGetToken.mockResolvedValue(null);
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: new Map(),
        method: 'GET',
        url: 'https://example.com/dashboard'
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.shouldClearCookies).toBe(true);
      expect(result.reason).toBe('No valid session token found');
    });

    it('should detect session rotation needed', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - (3 * 60 * 60); // 3 hours ago
      mockGetToken.mockResolvedValue({
        iat: oldTimestamp,
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: new Map([
          ['next-auth.session-token', { value: 'valid.jwt.token' }]
        ]),
        method: 'GET',
        url: 'https://example.com/dashboard'
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest, {
        sessionRotationInterval: 120 // 2 hours
      });
      
      expect(result.isValid).toBe(true);
      expect(result.shouldRotateSession).toBe(true);
      expect(result.recommendations).toContain('Session should be rotated due to age');
    });

    it('should detect suspicious cookie content', async () => {
      mockGetToken.mockResolvedValue({
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: new Map([
          ['next-auth.session-token', { value: '<script>alert("xss")</script>' }]
        ]),
        method: 'GET',
        url: 'https://example.com/dashboard'
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.shouldClearCookies).toBe(true);
      expect(result.reason).toBe('Suspicious cookie content detected');
    });

    it('should validate CSRF protection for non-GET requests', async () => {
      mockGetToken.mockResolvedValue({
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: new Map([
          ['next-auth.session-token', { value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' }]
        ]),
        method: 'POST',
        url: 'https://example.com/api/data'
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.recommendations).toContain('CSRF token missing for non-GET request');
    });

    it('should reject insecure transmission in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockGetToken.mockResolvedValue({
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: new Map(),
        method: 'GET',
        url: 'http://example.com/dashboard' // HTTP in production
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Insecure transmission in production environment');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should accept HTTPS via proxy headers in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockGetToken.mockResolvedValue({
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
          ['x-forwarded-proto', 'https']
        ]),
        cookies: new Map(),
        method: 'GET',
        url: 'http://staging-retroai.tryitnow.dev/dashboard' // HTTP URL but HTTPS via proxy
      } as unknown as NextRequest;

      mockRequest.headers.get = jest.fn((key: string) => {
        const headers: Record<string, string> = {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'x-forwarded-proto': 'https'
        };
        return headers[key] || null;
      });

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should accept HTTPS via Cloudflare cf-visitor header in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockGetToken.mockResolvedValue({
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
          ['cf-visitor', '{"scheme":"https"}']
        ]),
        cookies: new Map(),
        method: 'GET',
        url: 'http://localhost:3000/dashboard' // Internal URL but HTTPS via Cloudflare
      } as unknown as NextRequest;

      mockRequest.headers.get = jest.fn((key: string) => {
        const headers: Record<string, string> = {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'cf-visitor': '{"scheme":"https"}'
        };
        return headers[key] || null;
      });

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(true);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('createSecureCookieHeaders', () => {
    it('should create secure cookie with all options', () => {
      const result = createSecureCookieHeaders({
        name: 'test-cookie',
        value: 'test-value',
        maxAge: 3600,
        domain: 'example.com',
        path: '/app',
        secure: true,
        httpOnly: true,
        sameSite: 'strict'
      });

      expect(result).toContain('test-cookie=test-value');
      expect(result).toContain('Max-Age=3600');
      expect(result).toContain('Domain=example.com');
      expect(result).toContain('Path=/app');
      expect(result).toContain('Secure');
      expect(result).toContain('HttpOnly');
      expect(result).toContain('SameSite=strict');
    });

    it('should use secure defaults in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const result = createSecureCookieHeaders({
        name: 'session',
        value: 'session-value'
      });

      expect(result).toContain('Secure');
      expect(result).toContain('HttpOnly');
      expect(result).toContain('SameSite=strict');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear all authentication cookies', () => {
      const mockResponse = {
        cookies: {
          set: jest.fn()
        }
      } as unknown as NextResponse;

      const result = clearAuthCookies(mockResponse);

      expect(mockResponse.cookies.set).toHaveBeenCalledTimes(6);
      expect(mockResponse.cookies.set).toHaveBeenCalledWith({
        name: 'next-auth.session-token',
        value: '',
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
    });
  });

  describe('detectSessionHijacking', () => {
    it('should detect low risk for normal request', () => {
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
        ]),
        cookies: new Map([
          ['next-auth.session-token', { value: 'valid-token' }]
        ])
      } as unknown as NextRequest;

      mockRequest.cookies.getAll = jest.fn().mockReturnValue([
        { name: 'next-auth.session-token', value: 'valid-token' }
      ]);

      const result = detectSessionHijacking(mockRequest);

      expect(result.isHijackingAttempt).toBe(false);
      expect(result.riskLevel).toBe('low');
      expect(result.indicators).toHaveLength(0);
    });

    it('should detect medium risk for multiple session cookies', () => {
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
        ]),
        cookies: new Map()
      } as unknown as NextRequest;

      mockRequest.cookies.getAll = jest.fn().mockReturnValue([
        { name: 'session-1', value: 'token1' },
        { name: 'auth-token', value: 'token2' },
        { name: 'session-backup', value: 'token3' },
        { name: 'extra-session', value: 'token4' }
      ]);

      const result = detectSessionHijacking(mockRequest);

      expect(result.isHijackingAttempt).toBe(true);
      expect(result.riskLevel).toBe('medium');
      expect(result.indicators).toContain('Multiple session cookies detected');
    });

    it('should detect high risk for suspicious headers', () => {
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
          ['x-original-url', 'malicious.com']
        ]),
        cookies: new Map()
      } as unknown as NextRequest;

      mockRequest.cookies.getAll = jest.fn().mockReturnValue([]);

      const result = detectSessionHijacking(mockRequest);

      expect(result.isHijackingAttempt).toBe(true);
      expect(result.riskLevel).toBe('high');
      expect(result.indicators).toContain('Suspicious header detected: x-original-url');
    });

    it('should allow x-forwarded-host header (not suspicious)', () => {
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
          ['x-forwarded-host', 'staging-retroai.tryitnow.dev']
        ]),
        cookies: new Map()
      } as unknown as NextRequest;

      mockRequest.cookies.getAll = jest.fn().mockReturnValue([
        { name: 'next-auth.session-token', value: 'valid-token' }
      ]);

      const result = detectSessionHijacking(mockRequest);

      expect(result.isHijackingAttempt).toBe(false);
      expect(result.riskLevel).toBe('low');
      expect(result.indicators).toHaveLength(0);
    });

    it('should detect suspicious user agent', () => {
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Bot']  // Suspiciously short
        ]),
        cookies: new Map()
      } as unknown as NextRequest;

      mockRequest.cookies.getAll = jest.fn().mockReturnValue([]);

      const result = detectSessionHijacking(mockRequest);

      expect(result.isHijackingAttempt).toBe(true);
      expect(result.riskLevel).toBe('medium');
      expect(result.indicators).toContain('Suspicious or missing User-Agent header');
    });
  });

  describe('generateSecureSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSecureSessionId();
      const id2 = generateSecureSessionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(id2).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(id1)).toBe(true);
      expect(/^[a-f0-9]+$/.test(id2)).toBe(true);
    });
  });

  describe('validateSessionTokenStructure', () => {
    it('should validate proper JWT structure', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const result = validateSessionTokenStructure(validJWT);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject invalid JWT structure', () => {
      const invalidJWT = 'invalid.jwt';
      
      const result = validateSessionTokenStructure(invalidJWT);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Token does not have valid JWT structure (header.payload.signature)');
    });

    it('should reject suspiciously short tokens', () => {
      const shortToken = 'a.b.c';
      
      const result = validateSessionTokenStructure(shortToken);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Token is suspiciously short');
    });

    it('should reject suspiciously long tokens', () => {
      const longToken = 'a'.repeat(5000) + '.' + 'b'.repeat(5000) + '.' + 'c'.repeat(5000);
      
      const result = validateSessionTokenStructure(longToken);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Token is suspiciously long');
    });

    it('should reject tokens with invalid characters', () => {
      const invalidToken = 'header<script>.payload.signature';
      
      const result = validateSessionTokenStructure(invalidToken);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Token contains invalid characters');
    });
  });
});