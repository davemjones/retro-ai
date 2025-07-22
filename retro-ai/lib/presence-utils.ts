/**
 * Utility functions for user presence management
 */

export interface ActiveUser {
  userId: string;
  userName: string;
  userEmail: string;
  socketId?: string;
  timestamp: number;
  status?: 'active' | 'away' | 'offline';
}

/**
 * Get user initials from name and email
 */
export function getUserInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Format presence count for display
 */
export function formatPresenceCount(count: number): string {
  if (count === 0) return "No one online";
  if (count === 1) return "1 person online";
  return `${count} people online`;
}

/**
 * Get user presence status based on last activity
 */
export function getUserPresenceStatus(lastSeen: number): 'active' | 'away' | 'offline' {
  const now = Date.now();
  const diff = now - lastSeen;
  
  if (diff < 30000) return 'active';      // < 30 seconds
  if (diff < 300000) return 'away';       // < 5 minutes  
  return 'offline';                        // > 5 minutes
}

/**
 * Sort users by activity (most recent first)
 */
export function sortUsersByActivity(users: ActiveUser[]): ActiveUser[] {
  return [...users].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Remove duplicate users (keeping most recent)
 */
export function deduplicateUsers(users: ActiveUser[]): ActiveUser[] {
  const userMap = new Map<string, ActiveUser>();
  
  users.forEach(user => {
    const existing = userMap.get(user.userId);
    if (!existing || user.timestamp > existing.timestamp) {
      userMap.set(user.userId, user);
    }
  });
  
  return Array.from(userMap.values());
}

/**
 * Get presence indicator color based on status
 */
export function getPresenceColor(status: 'active' | 'away' | 'offline'): string {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'offline':
    default:
      return 'bg-gray-400';
  }
}