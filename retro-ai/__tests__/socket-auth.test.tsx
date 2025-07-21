import { authenticateSocket, validateSocketSession, createBoardIsolationMiddleware } from '../lib/socket-auth';
import { SessionManager } from '../lib/session-manager';
import { generateSessionFingerprint } from '../lib/session-utils';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('../lib/session-manager');
jest.mock('../lib/session-utils');
jest.mock('next-auth/jwt');

const mockSessionManager = SessionManager as jest.Mocked<typeof SessionManager>;
const mockGenerateSessionFingerprint = generateSessionFingerprint as jest.MockedFunction<typeof generateSessionFingerprint>;
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

describe('Socket Authentication', () => {
  const mockSocket = {
    id: 'socket123',
    handshake: {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.1',
        'cookie': 'next-auth.session-token=test-token'
      },
      address: '192.168.1.1'
    },
    emit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'test-secret';
  });

  describe('authenticateSocket', () => {
    it('should authenticate a valid socket connection', async () => {
      // Mock successful authentication
      mockGetToken.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        sessionId: 'session123'
      });

      mockSessionManager.validateSession.mockResolvedValue({
        isValid: true,
        session: {
          id: 'session-record-123',
          sessionId: 'session123',
          deviceType: 'desktop',
          browserName: 'Chrome',
          osName: 'Windows',
          location: 'New York, US',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          isActive: true,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }
      });

      mockGenerateSessionFingerprint.mockResolvedValue({
        ipHash: 'test-ip-hash',
        userAgentHash: 'test-ua-hash',
        timestamp: Date.now()
      });

      mockSessionManager.updateSessionActivity.mockResolvedValue();

      const result = await authenticateSocket(mockSocket, {
        enableFingerprinting: true,
        enableSessionValidation: true,
        enableRealTimeMonitoring: true,
      });

      expect(result).toBeTruthy();
      expect(result?.userId).toBe('user123');
      expect(result?.sessionId).toBe('session123');
      expect(result?.isAuthenticated).toBe(true);
      expect(mockSessionManager.updateSessionActivity).toHaveBeenCalledWith(
        'session123',
        expect.any(Object),
        'socket_connect'
      );
    });

    it('should reject socket connection with invalid token', async () => {
      mockGetToken.mockResolvedValue(null);

      const result = await authenticateSocket(mockSocket);

      expect(result).toBeNull();
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should reject socket connection with invalid session', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        sessionId: 'session123'
      });

      mockSessionManager.validateSession.mockResolvedValue({
        isValid: false,
        reason: 'Session expired'
      });

      const result = await authenticateSocket(mockSocket, {
        enableSessionValidation: true
      });

      expect(result).toBeNull();
    });

    it('should work without session validation when disabled', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        sessionId: 'session123'
      });

      mockGenerateSessionFingerprint.mockResolvedValue({
        ipHash: 'test-ip-hash',
        userAgentHash: 'test-ua-hash',
        timestamp: Date.now()
      });

      const result = await authenticateSocket(mockSocket, {
        enableSessionValidation: false,
        enableFingerprinting: false, // Disable fingerprinting to avoid session lookup
      });

      expect(result).toBeTruthy();
      expect(result?.userId).toBe('user123');
      expect(mockSessionManager.validateSession).not.toHaveBeenCalled();
    });
  });

  describe('validateSocketSession', () => {
    const mockSession = {
      userId: 'user123',
      userName: 'Test User',
      sessionId: 'session123',
      fingerprint: {
        ipHash: 'test-ip-hash',
        userAgentHash: 'test-ua-hash',
        timestamp: Date.now()
      },
      isAuthenticated: true,
      lastActivity: Date.now(),
    };

    it('should validate a healthy session', async () => {
      mockSessionManager.validateSession.mockResolvedValue({
        isValid: true,
        session: {
          id: 'session-record-123',
          sessionId: 'session123',
          deviceType: 'desktop',
          browserName: 'Chrome',
          osName: 'Windows',
          location: 'New York, US',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          isActive: true,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }
      });

      mockSessionManager.updateSessionActivity.mockResolvedValue();

      const result = await validateSocketSession(mockSocket, mockSession, 'test_operation');

      expect(result.isValid).toBe(true);
      expect(mockSessionManager.updateSessionActivity).toHaveBeenCalledWith(
        'session123',
        expect.any(Object),
        'socket_test_operation'
      );
    });

    it('should reject unauthenticated session', async () => {
      const unauthenticatedSession = {
        ...mockSession,
        isAuthenticated: false
      };

      const result = await validateSocketSession(mockSocket, unauthenticatedSession, 'test_operation');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Not authenticated');
    });

    it('should reject idle session', async () => {
      const idleSession = {
        ...mockSession,
        lastActivity: Date.now() - (35 * 60 * 1000) // 35 minutes ago
      };

      const result = await validateSocketSession(mockSocket, idleSession, 'test_operation');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session idle timeout');
    });

    it('should reject invalid database session', async () => {
      mockSessionManager.validateSession.mockResolvedValue({
        isValid: false,
        reason: 'Session not found'
      });

      const result = await validateSocketSession(mockSocket, mockSession, 'test_operation');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session not found');
    });
  });

  describe('createBoardIsolationMiddleware', () => {
    const mockSession = {
      userId: 'user123',
      userName: 'Test User',
      sessionId: 'session123',
      fingerprint: {
        ipHash: 'test-ip-hash',
        userAgentHash: 'test-ua-hash',
        timestamp: Date.now()
      },
      isAuthenticated: true,
      lastActivity: Date.now(),
    };

    it('should allow access for authenticated session', async () => {
      mockSessionManager.updateSessionActivity.mockResolvedValue();

      const middleware = createBoardIsolationMiddleware(mockSession);
      const result = await middleware('board123');

      expect(result.canAccess).toBe(true);
      expect(mockSession.boardId).toBe('board123');
      expect(mockSessionManager.updateSessionActivity).toHaveBeenCalledWith(
        'session123',
        expect.any(Object),
        'board_access'
      );
    });

    it('should deny access for unauthenticated session', async () => {
      const unauthenticatedSession = {
        ...mockSession,
        isAuthenticated: false
      };

      const middleware = createBoardIsolationMiddleware(unauthenticatedSession);
      const result = await middleware('board123');

      expect(result.canAccess).toBe(false);
      expect(result.reason).toBe('Not authenticated');
    });

    it('should handle activity logging errors gracefully', async () => {
      mockSessionManager.updateSessionActivity.mockRejectedValue(new Error('Database error'));

      const middleware = createBoardIsolationMiddleware(mockSession);
      const result = await middleware('board123');

      // Should still allow access even if logging fails
      expect(result.canAccess).toBe(true);
      expect(mockSession.boardId).toBe('board123');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('Token validation error'));

      const result = await authenticateSocket(mockSocket);

      expect(result).toBeNull();
    });

    it('should handle session validation errors gracefully', async () => {
      const mockSession = {
        userId: 'user123',
        userName: 'Test User',
        sessionId: 'session123',
        fingerprint: {
          ipHash: 'test-ip-hash',
          userAgentHash: 'test-ua-hash',
          timestamp: Date.now()
        },
        isAuthenticated: true,
        lastActivity: Date.now(),
      };

      mockSessionManager.validateSession.mockRejectedValue(new Error('Database error'));

      const result = await validateSocketSession(mockSocket, mockSession, 'test_operation');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Validation error');
    });
  });

  describe('Security Features', () => {
    it('should set up monitoring when enabled', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        sessionId: 'session123'
      });

      mockSessionManager.validateSession.mockResolvedValue({
        isValid: true,
        session: {
          id: 'session-record-123',
          sessionId: 'session123',
          deviceType: 'desktop',
          browserName: 'Chrome',
          osName: 'Windows',
          location: 'New York, US',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          isActive: true,
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        }
      });

      mockGenerateSessionFingerprint.mockResolvedValue({
        ipHash: 'test-ip-hash',
        userAgentHash: 'test-ua-hash',
        timestamp: Date.now()
      });

      mockSessionManager.updateSessionActivity.mockResolvedValue();

      await authenticateSocket(mockSocket, {
        enableRealTimeMonitoring: true,
        sessionTimeoutMs: 60000,
        maxIdleTimeMs: 30000,
      });

      // Verify that socket event listeners were set up
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should generate fingerprint when enabled', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        sessionId: 'session123'
      });

      mockGenerateSessionFingerprint.mockResolvedValue({
        ipHash: 'test-ip-hash',
        userAgentHash: 'test-ua-hash',
        timestamp: Date.now()
      });

      mockSessionManager.updateSessionActivity.mockResolvedValue();

      const result = await authenticateSocket(mockSocket, {
        enableFingerprinting: true,
        enableSessionValidation: false,
      });

      expect(mockGenerateSessionFingerprint).toHaveBeenCalled();
      expect(result?.fingerprint).toEqual({
        ipHash: 'test-ip-hash',
        userAgentHash: 'test-ua-hash',
        timestamp: expect.any(Number)
      });
    });
  });
});