"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

/**
 * Client-side session activity tracker
 * Tracks page views and user activity for session management
 */
export function useSessionActivityTracker() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track page views
  useEffect(() => {
    if (!session?.sessionId) return;

    const trackPageView = async () => {
      try {
        await fetch('/api/sessions/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'page_view',
            resource: pathname,
          }),
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
  }, [pathname, session?.sessionId]);

  // Track general activity with periodic updates
  useEffect(() => {
    if (!session?.sessionId) return;

    const trackActivity = async (action: string) => {
      try {
        await fetch('/api/sessions/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
          }),
        });
        lastActivityRef.current = Date.now();
      } catch (error) {
        console.error('Failed to track activity:', error);
      }
    };

    // Track mouse movement, clicks, and keyboard activity
    const handleActivity = () => {
      const now = Date.now();
      // Throttle activity tracking to every 30 seconds
      if (now - lastActivityRef.current > 30000) {
        trackActivity('user_activity');
      }
    };

    // Set up activity listeners
    document.addEventListener('mousemove', handleActivity, { passive: true });
    document.addEventListener('click', handleActivity, { passive: true });
    document.addEventListener('keydown', handleActivity, { passive: true });
    document.addEventListener('scroll', handleActivity, { passive: true });

    // Set up periodic heartbeat (every 5 minutes)
    trackingIntervalRef.current = setInterval(() => {
      trackActivity('heartbeat');
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
    };
  }, [session?.sessionId]);

  // Track when user leaves the page
  useEffect(() => {
    if (!session?.sessionId) return;

    const handleBeforeUnload = async () => {
      try {
        // Use sendBeacon for reliable tracking on page unload
        navigator.sendBeacon('/api/sessions/activity', JSON.stringify({
          action: 'page_unload',
          resource: pathname,
        }));
      } catch (error) {
        console.error('Failed to track page unload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session?.sessionId, pathname]);
}