import { 
  generateSessionFingerprint, 
  generateServerFingerprint,
  validateSessionFingerprint, 
  detectSessionAnomaly,
  generateTabSessionId
} from '@/lib/session-utils';
import { NextRequest } from 'next/server';

// Mock environment variable
process.env.NEXTAUTH_SECRET = 'test-secret-key';

// Mock crypto.subtle for Jest environment
const mockDigest = jest.fn();
const mockGetRandomValues = jest.fn();

beforeAll(() => {
  // Setup crypto mock
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: {
        digest: mockDigest
      },
      getRandomValues: mockGetRandomValues
    },
    writable: true
  });

  // Mock digest to return predictable values
  mockDigest.mockImplementation(async (algorithm: string, data: Uint8Array) => {
    // Create a deterministic hash based on input
    const input = Array.from(data).join('');
    const hash = Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const buffer = new ArrayBuffer(32); // SHA-256 produces 32 bytes
    const view = new Uint8Array(buffer);
    for (let i = 0; i < 32; i++) {
      view[i] = (hash + i) % 256;
    }
    return buffer;
  });

  // Mock getRandomValues
  mockGetRandomValues.mockImplementation((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  });
});

describe('Session Isolation Utilities', () => {
  describe('Session Fingerprinting', () => {
    it('should generate consistent fingerprints for same request context', async () => {
      const mockRequest = {
        headers: new Map([
          ['x-forwarded-for', '192.168.1.1'],
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
        ])
      } as NextRequest;

      const fingerprint1 = await generateSessionFingerprint(mockRequest);
      const fingerprint2 = await generateSessionFingerprint(mockRequest);

      expect(fingerprint1.ipHash).toBe(fingerprint2.ipHash);
      expect(fingerprint1.userAgentHash).toBe(fingerprint2.userAgentHash);
    });

    it('should generate different fingerprints for different IP addresses', async () => {
      const mockRequest1 = {
        headers: new Map([
          ['x-forwarded-for', '192.168.1.1'],
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
        ])
      } as NextRequest;

      const mockRequest2 = {
        headers: new Map([
          ['x-forwarded-for', '192.168.1.2'],
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
        ])
      } as NextRequest;

      const fingerprint1 = await generateSessionFingerprint(mockRequest1);
      const fingerprint2 = await generateSessionFingerprint(mockRequest2);

      expect(fingerprint1.ipHash).not.toBe(fingerprint2.ipHash);
      expect(fingerprint1.userAgentHash).toBe(fingerprint2.userAgentHash);
    });

    it('should generate different fingerprints for different user agents', async () => {
      const mockRequest1 = {
        headers: new Map([
          ['x-forwarded-for', '192.168.1.1'],
          ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36']
        ])
      } as NextRequest;

      const mockRequest2 = {
        headers: new Map([
          ['x-forwarded-for', '192.168.1.1'],
          ['user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36']
        ])
      } as NextRequest;

      const fingerprint1 = await generateSessionFingerprint(mockRequest1);
      const fingerprint2 = await generateSessionFingerprint(mockRequest2);

      expect(fingerprint1.ipHash).toBe(fingerprint2.ipHash);
      expect(fingerprint1.userAgentHash).not.toBe(fingerprint2.userAgentHash);
    });
  });

  describe('Session Validation', () => {
    it('should validate matching fingerprints as valid', () => {
      const baseTime = Date.now();
      const fingerprint1 = {
        ipHash: 'abc123',
        userAgentHash: 'def456',
        timestamp: baseTime
      };
      const fingerprint2 = {
        ipHash: 'abc123',
        userAgentHash: 'def456',
        timestamp: baseTime + 1000 // 1 second later
      };

      const validation = validateSessionFingerprint(fingerprint1, fingerprint2);
      expect(validation.isValid).toBe(true);
    });

    it('should reject fingerprints with mismatched IP', () => {
      const baseTime = Date.now();
      const fingerprint1 = {
        ipHash: 'abc123',
        userAgentHash: 'def456',
        timestamp: baseTime
      };
      const fingerprint2 = {
        ipHash: 'xyz789', // Different IP
        userAgentHash: 'def456',
        timestamp: baseTime + 1000
      };

      const validation = validateSessionFingerprint(fingerprint1, fingerprint2);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('IP address mismatch');
    });

    it('should reject fingerprints with mismatched User-Agent', () => {
      const baseTime = Date.now();
      const fingerprint1 = {
        ipHash: 'abc123',
        userAgentHash: 'def456',
        timestamp: baseTime
      };
      const fingerprint2 = {
        ipHash: 'abc123',
        userAgentHash: 'xyz789', // Different User-Agent
        timestamp: baseTime + 1000
      };

      const validation = validateSessionFingerprint(fingerprint1, fingerprint2);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('User agent mismatch');
    });

    it('should reject expired fingerprints', () => {
      const baseTime = Date.now();
      const fingerprint1 = {
        ipHash: 'abc123',
        userAgentHash: 'def456',
        timestamp: baseTime - (25 * 60 * 60 * 1000) // 25 hours ago
      };
      const fingerprint2 = {
        ipHash: 'abc123',
        userAgentHash: 'def456',
        timestamp: baseTime
      };

      const validation = validateSessionFingerprint(fingerprint1, fingerprint2);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Fingerprint expired');
    });
  });

  describe('Session Anomaly Detection', () => {
    it('should detect no anomaly for consistent session history', () => {
      const baseTime = Date.now();
      const sessionHistory = [
        {
          ipHash: 'abc123',
          userAgentHash: 'def456',
          timestamp: baseTime - 3600000 // 1 hour ago
        },
        {
          ipHash: 'abc123',
          userAgentHash: 'def456',
          timestamp: baseTime - 1800000 // 30 minutes ago
        }
      ];
      const currentFingerprint = {
        ipHash: 'abc123',
        userAgentHash: 'def456',
        timestamp: baseTime
      };

      const anomaly = detectSessionAnomaly(sessionHistory, currentFingerprint);
      expect(anomaly.isAnomalous).toBe(false);
      expect(anomaly.risk).toBe('low');
    });

    it('should detect medium risk for IP address change', () => {
      const baseTime = Date.now();
      const sessionHistory = [
        {
          ipHash: 'abc123',
          userAgentHash: 'def456',
          timestamp: baseTime - 3600000
        }
      ];
      const currentFingerprint = {
        ipHash: 'xyz789', // Changed IP
        userAgentHash: 'def456',
        timestamp: baseTime
      };

      const anomaly = detectSessionAnomaly(sessionHistory, currentFingerprint);
      expect(anomaly.isAnomalous).toBe(true);
      expect(anomaly.risk).toBe('medium');
      expect(anomaly.reasons).toContain('IP address changed');
    });

    it('should detect high risk for rapid environment change', () => {
      const baseTime = Date.now();
      const sessionHistory = [
        {
          ipHash: 'abc123',
          userAgentHash: 'def456',
          timestamp: baseTime - 60000 // 1 minute ago
        }
      ];
      const currentFingerprint = {
        ipHash: 'xyz789', // Changed IP
        userAgentHash: 'ghi789', // Changed User-Agent
        timestamp: baseTime
      };

      const anomaly = detectSessionAnomaly(sessionHistory, currentFingerprint);
      expect(anomaly.isAnomalous).toBe(true);
      expect(anomaly.risk).toBe('high');
      expect(anomaly.reasons).toContain('Rapid environment change detected');
    });
  });

  describe('Tab Session Management', () => {
    it('should generate unique tab session IDs', () => {
      const id1 = generateTabSessionId();
      const id2 = generateTabSessionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(id2).toHaveLength(32);
    });
  });

  describe('Server-side Fingerprinting', () => {
    it('should generate fingerprints from server headers', async () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1');
      headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const fingerprint = await generateServerFingerprint(headers);
      
      expect(fingerprint.ipHash).toBeDefined();
      expect(fingerprint.userAgentHash).toBeDefined();
      expect(fingerprint.timestamp).toBeDefined();
      expect(typeof fingerprint.ipHash).toBe('string');
      expect(typeof fingerprint.userAgentHash).toBe('string');
      expect(typeof fingerprint.timestamp).toBe('number');
    });

    it('should handle missing headers gracefully', async () => {
      const headers = new Headers();
      
      const fingerprint = await generateServerFingerprint(headers);
      
      expect(fingerprint.ipHash).toBeDefined();
      expect(fingerprint.userAgentHash).toBeDefined();
      expect(fingerprint.timestamp).toBeDefined();
    });
  });
});