"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface SessionInfo {
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

interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  dailyActivity: Record<string, number>;
  deviceStats: Record<string, number>;
  recentActivities: Array<{
    action: string;
    timestamp: Date;
    metadata?: any;
  }>;
}

export function useSessionManager() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize session tracking
  useEffect(() => {
    if (session?.sessionId) {
      initializeSession();
    }
  }, [session]);

  const initializeSession = useCallback(async () => {
    try {
      // Create session in database if it doesn't exist
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });

      // Load current session info
      loadCurrentSession();
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions?action=list');
      const data = await response.json();

      if (response.ok) {
        setSessions(data.sessions.map((s: any) => ({
          ...s,
          lastActivity: new Date(s.lastActivity),
          expiresAt: new Date(s.expiresAt),
          createdAt: new Date(s.createdAt)
        })));
      } else {
        setError(data.error || 'Failed to load sessions');
      }
    } catch (error) {
      setError('Network error while loading sessions');
      console.error('Load sessions error:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const loadCurrentSession = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/sessions?action=current');
      const data = await response.json();

      if (response.ok && data.currentSession) {
        setCurrentSession({
          ...data.currentSession,
          lastActivity: new Date(data.currentSession.lastActivity),
          expiresAt: new Date(data.currentSession.expiresAt),
          createdAt: new Date(data.currentSession.createdAt)
        });
      }
    } catch (error) {
      console.error('Failed to load current session:', error);
    }
  }, [session]);

  const loadAnalytics = useCallback(async (days: number = 30) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions?action=analytics&days=${days}`);
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      setError('Network error while loading analytics');
      console.error('Load analytics error:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const terminateSession = useCallback(async (sessionId: string) => {
    if (!session) return false;

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'terminate', 
          sessionId 
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Reload sessions list
        loadSessions();
        return true;
      } else {
        setError(data.error || 'Failed to terminate session');
        return false;
      }
    } catch (error) {
      setError('Network error while terminating session');
      console.error('Terminate session error:', error);
      return false;
    }
  }, [session, loadSessions]);

  const terminateOtherSessions = useCallback(async () => {
    if (!session) return 0;

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'terminate_others' })
      });

      const data = await response.json();

      if (response.ok) {
        // Reload sessions list
        loadSessions();
        return data.terminatedCount;
      } else {
        setError(data.error || 'Failed to terminate other sessions');
        return 0;
      }
    } catch (error) {
      setError('Network error while terminating sessions');
      console.error('Terminate other sessions error:', error);
      return 0;
    }
  }, [session, loadSessions]);

  const logActivity = useCallback(async (
    action: string,
    resource?: string,
    duration?: number,
    metadata?: any
  ) => {
    if (!session) return;

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activity',
          activityAction: action,
          resource,
          duration,
          metadata
        })
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [session]);

  // Auto-refresh sessions periodically
  useEffect(() => {
    if (session && sessions.length > 0) {
      const interval = setInterval(() => {
        loadSessions();
      }, 60000); // Refresh every minute

      return () => clearInterval(interval);
    }
  }, [session, sessions.length, loadSessions]);

  return {
    sessions,
    currentSession,
    analytics,
    loading,
    error,
    loadSessions,
    loadCurrentSession,
    loadAnalytics,
    terminateSession,
    terminateOtherSessions,
    logActivity,
    clearError: () => setError(null)
  };
}