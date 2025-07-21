import { prisma } from './prisma';
import { generateServerFingerprint } from './session-utils';
import { NextRequest } from 'next/server';

/**
 * Comprehensive session management service for tracking and managing user sessions
 */

export interface SessionInfo {
  id: string;
  sessionId: string;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  location?: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionActivity {
  action: string;
  resource?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface DeviceInfo {
  deviceType: string;
  browserName: string;
  osName: string;
}

export class SessionManager {
  /**
   * Create a new session record in the database
   */
  static async createSession(
    userId: string,
    sessionId: string,
    req: NextRequest,
    expiresAt: Date
  ): Promise<void> {
    try {
      const deviceInfo = this.parseUserAgent(req.headers.get('user-agent') || '');
      const ipAddress = this.getClientIP(req);
      const fingerprint = await generateServerFingerprint(req.headers);

      await prisma.userSession.create({
        data: {
          sessionId,
          userId,
          ipAddress,
          userAgent: req.headers.get('user-agent') || 'Unknown',
          deviceType: deviceInfo.deviceType,
          browserName: deviceInfo.browserName,
          osName: deviceInfo.osName,
          location: await this.getLocationFromIP(ipAddress),
          expiresAt,
          fingerprint: JSON.parse(JSON.stringify(fingerprint)),
          securityFlags: {
            initialFingerprint: JSON.parse(JSON.stringify(fingerprint)),
            createdFromIP: ipAddress,
            trustLevel: 'normal'
          }
        }
      });

      // Log session creation activity
      await this.logActivity(sessionId, {
        action: 'session_created',
        metadata: {
          deviceInfo,
          ipAddress,
          fingerprint
        }
      }, req);

      console.log(`Session created: ${sessionId} for user ${userId}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Update session activity and extend expiration if needed
   */
  static async updateSessionActivity(
    sessionId: string,
    req: NextRequest,
    action: string = 'activity'
  ): Promise<void> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionId }
      });

      if (!session || !session.isActive) {
        return;
      }

      // Update last activity
      await prisma.userSession.update({
        where: { sessionId },
        data: {
          lastActivity: new Date(),
          ipAddress: this.getClientIP(req), // Track IP changes
        }
      });

      // Log the activity
      await this.logActivity(sessionId, { action }, req);
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

      return sessions.map(session => ({
        id: session.id,
        sessionId: session.sessionId,
        deviceType: session.deviceType || undefined,
        browserName: session.browserName || undefined,
        osName: session.osName || undefined,
        location: session.location || undefined,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        isActive: session.isActive,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Terminate a specific session
   */
  static async terminateSession(
    sessionId: string,
    reason: string = 'user_logout'
  ): Promise<boolean> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionId }
      });

      if (!session) {
        return false;
      }

      // Mark session as inactive
      await prisma.userSession.update({
        where: { sessionId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Log termination activity
      await this.logActivity(sessionId, {
        action: 'session_terminated',
        metadata: { reason }
      });

      console.log(`Session terminated: ${sessionId}, reason: ${reason}`);
      return true;
    } catch (error) {
      console.error('Failed to terminate session:', error);
      return false;
    }
  }

  /**
   * Terminate all sessions for a user except the current one
   */
  static async terminateOtherSessions(
    userId: string,
    currentSessionId: string
  ): Promise<number> {
    try {
      const result = await prisma.userSession.updateMany({
        where: {
          userId,
          sessionId: {
            not: currentSessionId
          },
          isActive: true
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Log the action
      await this.logActivity(currentSessionId, {
        action: 'other_sessions_terminated',
        metadata: { terminatedCount: result.count }
      });

      console.log(`Terminated ${result.count} other sessions for user ${userId}`);
      return result.count;
    } catch (error) {
      console.error('Failed to terminate other sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const expiredSessions = await prisma.userSession.findMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { 
              lastActivity: { 
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days inactive
              }
            }
          ],
          isActive: true
        }
      });

      const sessionIds = expiredSessions.map(s => s.sessionId);

      if (sessionIds.length > 0) {
        // Log cleanup activities
        for (const sessionId of sessionIds) {
          await this.logActivity(sessionId, {
            action: 'session_expired_cleanup',
            metadata: { cleanupReason: 'expired_or_inactive' }
          });
        }

        // Mark as inactive
        await prisma.userSession.updateMany({
          where: {
            sessionId: { in: sessionIds }
          },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        });

        console.log(`Cleaned up ${sessionIds.length} expired sessions`);
      }

      return sessionIds.length;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get session analytics for a user
   */
  static async getSessionAnalytics(userId: string, days: number = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [totalSessions, activeSessions, recentActivities] = await Promise.all([
        // Total sessions in period
        prisma.userSession.count({
          where: {
            userId,
            createdAt: { gte: since }
          }
        }),

        // Currently active sessions
        prisma.userSession.count({
          where: {
            userId,
            isActive: true,
            expiresAt: { gt: new Date() }
          }
        }),

        // Recent activities
        prisma.sessionActivity.findMany({
          where: {
            session: { userId },
            timestamp: { gte: since }
          },
          select: {
            action: true,
            timestamp: true,
            metadata: true
          },
          orderBy: { timestamp: 'desc' },
          take: 100
        })
      ]);

      // Group activities by day
      const dailyActivity = recentActivities.reduce((acc, activity) => {
        const date = activity.timestamp.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Device type distribution
      const deviceStats = await prisma.userSession.groupBy({
        by: ['deviceType'],
        where: {
          userId,
          createdAt: { gte: since }
        },
        _count: true
      });

      return {
        totalSessions,
        activeSessions,
        dailyActivity,
        deviceStats: deviceStats.reduce((acc, stat) => {
          acc[stat.deviceType || 'unknown'] = stat._count;
          return acc;
        }, {} as Record<string, number>),
        recentActivities: recentActivities.slice(0, 20)
      };
    } catch (error) {
      console.error('Failed to get session analytics:', error);
      return null;
    }
  }

  /**
   * Log session activity
   */
  static async logActivity(
    sessionId: string,
    activity: SessionActivity,
    req?: NextRequest
  ): Promise<void> {
    try {
      await prisma.sessionActivity.create({
        data: {
          sessionId,
          action: activity.action,
          resource: activity.resource,
          duration: activity.duration,
          metadata: activity.metadata ? JSON.parse(JSON.stringify(activity.metadata)) : null,
          ipAddress: req ? this.getClientIP(req) : 'unknown',
          userAgent: req ? (req.headers.get('user-agent') || 'unknown') : 'unknown'
        }
      });
    } catch (error) {
      console.error('Failed to log session activity:', error);
    }
  }

  /**
   * Check if a session exists and is valid
   */
  static async validateSession(sessionId: string): Promise<{
    isValid: boolean;
    session?: SessionInfo;
    reason?: string;
  }> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionId }
      });

      if (!session) {
        return { isValid: false, reason: 'Session not found' };
      }

      if (!session.isActive) {
        return { isValid: false, reason: 'Session is inactive' };
      }

      if (session.expiresAt < new Date()) {
        return { isValid: false, reason: 'Session expired' };
      }

      return {
        isValid: true,
        session: {
          id: session.id,
          sessionId: session.sessionId,
          deviceType: session.deviceType || undefined,
          browserName: session.browserName || undefined,
          osName: session.osName || undefined,
          location: session.location || undefined,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          isActive: session.isActive,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        }
      };
    } catch (error) {
      console.error('Failed to validate session:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * Parse user agent to extract device information
   */
  private static parseUserAgent(userAgent: string): DeviceInfo {
    // Simple user agent parsing (in production, use a library like ua-parser-js)
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);
    
    let deviceType = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    let browserName = 'Unknown';
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';

    let osName = 'Unknown';
    if (userAgent.includes('Windows')) osName = 'Windows';
    else if (userAgent.includes('Macintosh')) osName = 'macOS';
    else if (userAgent.includes('Linux')) osName = 'Linux';
    else if (userAgent.includes('Android')) osName = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) osName = 'iOS';

    return { deviceType, browserName, osName };
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0] ||
           req.headers.get('x-real-ip') ||
           req.headers.get('cf-connecting-ip') ||
           'unknown';
  }

  /**
   * Get location from IP address (placeholder - integrate with IP geolocation service)
   */
  private static async getLocationFromIP(ipAddress: string): Promise<string | null> {
    // Placeholder implementation
    // In production, integrate with a service like MaxMind, IPinfo, or similar
    if (ipAddress === 'unknown' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return 'Local Network';
    }
    return null; // Would return "City, Country" from geo service
  }
}