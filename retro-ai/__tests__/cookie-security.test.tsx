import {
  validateCookieSecurity,
  createSecureCookieHeaders,
  clearAuthCookies,
  detectSessionHijacking,
  generateSecureSessionId,
  validateSessionTokenStructure
} from '@/lib/cookie-security';
import { NextRequest, NextResponse } from 'next/server';

// Mock environment variables
process.env.BETTER_AUTH_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Mock generateSessionFingerprint to avoid crypto API issues
jest.mock('../lib/session-utils', () => ({
  generateSessionFingerprint: jest.fn().mockResolvedValue({
    ipHash: 'test-ip-hash',
    userAgentHash: 'test-ua-hash',
    timestamp: Date.now()
  })
}));

// Mock Prisma Client
const mockPrismaInstance = {
  session: {
    findUnique: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  },
  $disconnect: jest.fn()
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance)
}));

const mockPrisma = mockPrismaInstance;

describe('Cookie Security Utilities', () => {
  // Mock console methods to suppress log messages in tests
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  
  beforeAll(() => {
    console.error = jest.fn();
    console.log = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Prisma mocks
    mockPrisma.session.findUnique.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.$disconnect.mockReset();
  });

  describe('validateCookieSecurity', () => {
    it('should return invalid for missing token', async () => {
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        },
        method: 'GET',
        url: 'https://example.com/dashboard'
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.shouldClearCookies).toBe(true);
      expect(result.reason).toBe('No valid session token found');
    });

    it('should detect session rotation needed', async () => {
      const oldTimestamp = new Date(Date.now() - (3 * 60 * 60 * 1000)); // 3 hours ago
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-id',
        token: 'valid-session-token',
        createdAt: oldTimestamp,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          emailVerified: true
        }
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: {
          get: jest.fn().mockImplementation((name) => {
            if (name === 'better-auth.session_token' || name === 'better-auth.session-token') {
              return { value: 'valid-session-token.signature' };
            }
            return undefined;
          })
        },
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
      // Mock a valid session but the cookie value contains suspicious content
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-id',
        token: 'valid-session-token', // This will be the clean part after decoding
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          emailVerified: true
        }
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: {
          get: jest.fn().mockReturnValue({ value: '<script>alert("xss")</script>.signature' })
        },
        method: 'GET',
        url: 'https://example.com/dashboard'
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(false);
      expect(result.shouldClearCookies).toBe(true);
      expect(result.reason).toBe('Suspicious cookie content detected');
    });

    it('should validate CSRF protection for non-GET requests', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-id',
        token: 'valid-session-token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          emailVerified: true
        }
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: {
          get: jest.fn().mockImplementation((name) => {
            if (name === 'better-auth.session_token' || name === 'better-auth.session-token') {
              return { value: 'valid-session-token.signature' };
            }
            return undefined;
          })
        },
        method: 'POST',
        url: 'https://example.com/api/data'
      } as unknown as NextRequest;

      const result = await validateCookieSecurity(mockRequest);
      
      expect(result.isValid).toBe(true);
      expect(result.recommendations).toContain('CSRF token missing for non-GET request - consider adding custom CSRF protection');
    });

    it('should reject insecure transmission in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-id',
        token: 'valid-session-token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          emailVerified: true
        }
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']
        ]),
        cookies: {
          get: jest.fn().mockImplementation((name) => {
            if (name === 'better-auth.session_token' || name === 'better-auth.session-token') {
              return { value: 'valid-session-token.signature' };
            }
            return undefined;
          })
        },
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
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-id',
        token: 'valid-session-token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          emailVerified: true
        }
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
          ['x-forwarded-proto', 'https']
        ]),
        cookies: {
          get: jest.fn().mockImplementation((name) => {
            if (name === 'better-auth.session_token' || name === 'better-auth.session-token') {
              return { value: 'valid-session-token.signature' };
            }
            return undefined;
          })
        },
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
      
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-id',
        token: 'valid-session-token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          emailVerified: true
        }
      });
      
      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'],
          ['cf-visitor', '{"scheme":"https"}']
        ]),
        cookies: {
          get: jest.fn().mockImplementation((name) => {
            if (name === 'better-auth.session_token' || name === 'better-auth.session-token') {
              return { value: 'valid-session-token.signature' };
            }
            return undefined;
          })
        },
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

      clearAuthCookies(mockResponse);

      expect(mockResponse.cookies.set).toHaveBeenCalledTimes(9);
      expect(mockResponse.cookies.set).toHaveBeenCalledWith({
        name: 'better-auth.session_token',
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
          ['better-auth.session_token', { value: 'valid-token' }]
        ])
      } as unknown as NextRequest;

      mockRequest.cookies.getAll = jest.fn().mockReturnValue([
        { name: 'better-auth.session_token', value: 'valid-token' }
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
        { name: 'better-auth.session_token', value: 'valid-token' }
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
    it('should validate proper Better Auth token structure', () => {
      const validToken = 'abcdefghijklmnopqrstuvwxyz123456789012345678901234567890.abcdefghijklmnopqrstuvwxyz123456789012345678901234567890';
      
      const result = validateSessionTokenStructure(validToken);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject invalid Better Auth token structure', () => {
      const invalidToken = 'invalid.token.with.too.many.parts';
      
      const result = validateSessionTokenStructure(invalidToken);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Token does not have valid Better Auth structure (sessionId.signature)');
    });

    it('should reject suspiciously short tokens', () => {
      const shortToken = 'a.b';
      
      const result = validateSessionTokenStructure(shortToken);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Token is suspiciously short');
    });

    it('should reject suspiciously long tokens', () => {
      const longToken = 'a'.repeat(2000) + '.' + 'b'.repeat(2000);
      
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