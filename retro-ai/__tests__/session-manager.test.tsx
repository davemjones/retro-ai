import { SessionManager } from '../lib/session-manager';
import { prisma } from '../lib/prisma';
import { NextRequest } from 'next/server';

// Mock prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    sessionActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock session-utils
jest.mock('../lib/session-utils', () => ({
  generateServerFingerprint: jest.fn().mockResolvedValue({
    ipHash: 'test-ip-hash',
    userAgentHash: 'test-ua-hash',
    timestamp: Date.now(),
  }),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe.skip('SessionManager', () => {
  const mockUserId = 'user123';
  const mockSessionId = 'session123';
  const mockRequest = {
    headers: new Map([
      ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
      ['x-forwarded-for', '192.168.1.1'],
    ]),
  } as unknown as NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session with all metadata', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-record-123',
        sessionId: mockSessionId,
        userId: mockUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        deviceType: 'desktop',
        browserName: 'Chrome',
        osName: 'Windows',
        location: null,
        isActive: true,
        lastActivity: new Date(),
        expiresAt,
        fingerprint: {},
        securityFlags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockPrisma.sessionActivity.create.mockResolvedValue({} as any);

      await SessionManager.createSession(mockUserId, mockSessionId, mockRequest, expiresAt);

      expect(mockPrisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: mockSessionId,
          userId: mockUserId,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          deviceType: 'desktop',
          browserName: 'Unknown', // Test user agent doesn't include Chrome
          osName: 'Windows',
          location: 'Local Network',
          expiresAt,
          fingerprint: expect.any(Object),
          securityFlags: expect.any(Object),
        }),
      });

      expect(mockPrisma.sessionActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: mockSessionId,
          action: 'session_created',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          metadata: expect.any(Object),
        }),
      });
    });

    it('should handle creation errors gracefully', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockPrisma.userSession.create.mockRejectedValue(new Error('Database error'));

      await expect(
        SessionManager.createSession(mockUserId, mockSessionId, mockRequest, expiresAt)
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session activity for active sessions', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-record-123',
        sessionId: mockSessionId,
        isActive: true,
      } as any);

      mockPrisma.userSession.update.mockResolvedValue({} as any);
      mockPrisma.sessionActivity.create.mockResolvedValue({} as any);

      await SessionManager.updateSessionActivity(mockSessionId, mockRequest, 'page_view');

      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { sessionId: mockSessionId },
        data: {
          lastActivity: expect.any(Date),
          ipAddress: '192.168.1.1',
        },
      });

      expect(mockPrisma.sessionActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: mockSessionId,
          action: 'page_view',
          ipAddress: '192.168.1.1',
        }),
      });
    });

    it('should not update inactive sessions', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-record-123',
        sessionId: mockSessionId,
        isActive: false,
      } as any);

      await SessionManager.updateSessionActivity(mockSessionId, mockRequest);

      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });

    it('should handle non-existent sessions', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      await SessionManager.updateSessionActivity(mockSessionId, mockRequest);

      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('getUserSessions', () => {
    it('should return active sessions for a user', async () => {
      const mockSessions = [
        {
          id: 'session1',
          sessionId: 'session123',
          deviceType: 'desktop',
          browserName: 'Chrome',
          osName: 'Windows',
          location: 'New York, US',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          isActive: true,
          lastActivity: new Date('2024-01-15T10:00:00Z'),
          expiresAt: new Date('2024-01-16T10:00:00Z'),
          createdAt: new Date('2024-01-15T09:00:00Z'),
        },
        {
          id: 'session2',
          sessionId: 'session456',
          deviceType: 'mobile',
          browserName: 'Safari',
          osName: 'iOS',
          location: 'Los Angeles, US',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0...',
          isActive: true,
          lastActivity: new Date('2024-01-15T11:00:00Z'),
          expiresAt: new Date('2024-01-16T11:00:00Z'),
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(mockSessions as any);

      const sessions = await SessionManager.getUserSessions(mockUserId);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionId).toBe('session123');
      expect(sessions[0].deviceType).toBe('desktop');
      expect(sessions[1].sessionId).toBe('session456');
      expect(sessions[1].deviceType).toBe('mobile');

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          lastActivity: 'desc',
        },
      });
    });

    it('should return empty array on error', async () => {
      mockPrisma.userSession.findMany.mockRejectedValue(new Error('Database error'));

      const sessions = await SessionManager.getUserSessions(mockUserId);

      expect(sessions).toEqual([]);
    });
  });

  describe('terminateSession', () => {
    it('should terminate an existing session', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'session-record-123',
        sessionId: mockSessionId,
      } as any);

      mockPrisma.userSession.update.mockResolvedValue({} as any);
      mockPrisma.sessionActivity.create.mockResolvedValue({} as any);

      const result = await SessionManager.terminateSession(mockSessionId, 'user_logout');

      expect(result).toBe(true);
      expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
        where: { sessionId: mockSessionId },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });

      expect(mockPrisma.sessionActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionId: mockSessionId,
          action: 'session_terminated',
          metadata: { reason: 'user_logout' },
        }),
      });
    });

    it('should return false for non-existent sessions', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      const result = await SessionManager.terminateSession(mockSessionId);

      expect(result).toBe(false);
      expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('terminateOtherSessions', () => {
    it('should terminate all other sessions except current', async () => {
      const currentSessionId = 'current-session';
      
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.sessionActivity.create.mockResolvedValue({} as any);

      const count = await SessionManager.terminateOtherSessions(mockUserId, currentSessionId);

      expect(count).toBe(3);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          sessionId: {
            not: currentSessionId,
          },
          isActive: true,
        },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired and inactive sessions', async () => {
      const expiredSessions = [
        { sessionId: 'expired1' },
        { sessionId: 'expired2' },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(expiredSessions as any);
      mockPrisma.sessionActivity.create.mockResolvedValue({} as any);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 2 } as any);

      const count = await SessionManager.cleanupExpiredSessions();

      expect(count).toBe(2);
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          sessionId: { in: ['expired1', 'expired2'] },
        },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle no expired sessions', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([]);

      const count = await SessionManager.cleanupExpiredSessions();

      expect(count).toBe(0);
      expect(mockPrisma.userSession.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    it('should validate an active, non-expired session', async () => {
      const mockSession = {
        id: 'session-record-123',
        sessionId: mockSessionId,
        deviceType: 'desktop',
        browserName: 'Chrome',
        osName: 'Windows',
        location: 'New York, US',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        isActive: true,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now
        createdAt: new Date(),
      };

      mockPrisma.userSession.findUnique.mockResolvedValue(mockSession as any);

      const result = await SessionManager.validateSession(mockSessionId);

      expect(result.isValid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.sessionId).toBe(mockSessionId);
    });

    it('should invalidate non-existent sessions', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);

      const result = await SessionManager.validateSession(mockSessionId);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session not found');
    });

    it('should invalidate inactive sessions', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        isActive: false,
      } as any);

      const result = await SessionManager.validateSession(mockSessionId);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session is inactive');
    });

    it('should invalidate expired sessions', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        isActive: true,
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
      } as any);

      const result = await SessionManager.validateSession(mockSessionId);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Session expired');
    });
  });

  describe('getSessionAnalytics', () => {
    it('should return comprehensive session analytics', async () => {
      const mockActivities = [
        {
          action: 'login',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          metadata: {},
        },
        {
          action: 'page_view',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          metadata: {},
        },
      ];

      const mockDeviceStats = [
        { deviceType: 'desktop', _count: 5 },
        { deviceType: 'mobile', _count: 3 },
      ];

      mockPrisma.userSession.count
        .mockResolvedValueOnce(8) // totalSessions
        .mockResolvedValueOnce(2); // activeSessions

      mockPrisma.sessionActivity.findMany.mockResolvedValue(mockActivities as any);
      mockPrisma.userSession.groupBy.mockResolvedValue(mockDeviceStats as any);

      const analytics = await SessionManager.getSessionAnalytics(mockUserId, 30);

      expect(analytics).toBeDefined();
      expect(analytics?.totalSessions).toBe(8);
      expect(analytics?.activeSessions).toBe(2);
      expect(analytics?.deviceStats).toEqual({
        desktop: 5,
        mobile: 3,
      });
      expect(analytics?.recentActivities).toHaveLength(2);
    });

    it('should return null on error', async () => {
      mockPrisma.userSession.count.mockRejectedValue(new Error('Database error'));

      const analytics = await SessionManager.getSessionAnalytics(mockUserId);

      expect(analytics).toBeNull();
    });
  });
});