"use client";

import { useSessionActivityTracker } from '@/hooks/use-session-activity-tracker';

/**
 * Activity tracker component that automatically tracks user session activity
 * This component should be included at the root level to track activity across all pages
 */
export function ActivityTracker() {
  useSessionActivityTracker();
  return null; // This component doesn't render anything
}