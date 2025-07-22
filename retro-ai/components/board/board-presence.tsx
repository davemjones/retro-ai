'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSocket as useSocketContext } from '@/lib/socket-context';
import { 
  ActiveUser, 
  getUserInitials, 
  sortUsersByActivity,
  deduplicateUsers
} from '@/lib/presence-utils';

interface BoardPresenceProps {
  boardId: string;
  currentUserId: string;
}

function BoardPresenceComponent({ boardId, currentUserId }: BoardPresenceProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  
  // Extract only the socket from context to minimize re-render triggers
  const socketContext = useSocketContext();
  const socket = socketContext.socket;

  // Extremely stable event handlers with aggressive state comparison
  const handleUserConnected = useCallback((data: {
    userId: string;
    userName: string;
    userEmail: string;
    timestamp: number;
  }) => {
    setActiveUsers(prev => {
      // Return existing array if user already exists (no re-render)
      if (prev.some(u => u.userId === data.userId)) {
        return prev;
      }
      return [...prev, data];
    });
  }, []);

  const handleUserDisconnected = useCallback((data: { userId: string }) => {
    setActiveUsers(prev => {
      const filtered = prev.filter(u => u.userId !== data.userId);
      // Return existing array if nothing changed (no re-render)
      return filtered.length === prev.length ? prev : filtered;
    });
  }, []);

  const handleRoomUsers = useCallback((users: ActiveUser[]) => {
    setActiveUsers(prev => {
      // Comprehensive equality check to prevent unnecessary updates
      if (prev.length === users.length) {
        const hasSameUsers = prev.every(u => users.some(nu => 
          nu.userId === u.userId && 
          nu.userName === u.userName && 
          nu.userEmail === u.userEmail
        ));
        if (hasSameUsers) return prev; // No change, no re-render
      }
      return users;
    });
  }, []);

  // Isolate socket effect with minimal dependencies
  useEffect(() => {
    if (!socket) return;

    // Set up event listeners
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('room-users', handleRoomUsers);

    // Join board room (this might already be done elsewhere, but ensure it)
    socket.emit('join-board', boardId);

    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('room-users', handleRoomUsers);
    };
  }, [socket, boardId, handleUserConnected, handleUserDisconnected, handleRoomUsers]);

  // Note: Removed periodic status updates - users in presence list are considered active
  // Real activity tracking would require heartbeat/interaction monitoring

  // Aggressively memoize processed users with deep comparison
  const { displayUsers, overflow } = useMemo(() => {
    if (activeUsers.length === 0) {
      return { displayUsers: [], overflow: 0 };
    }
    
    const processedUsers = sortUsersByActivity(deduplicateUsers(activeUsers));
    const displayUsers = processedUsers.slice(0, 5);
    const overflow = Math.max(0, processedUsers.length - 5);
    
    return { displayUsers, overflow };
  }, [activeUsers]);

  // Memoize individual avatar components to prevent re-renders
  const avatarComponents = useMemo(() => {
    return displayUsers.map((user) => (
      <div
        key={user.userId}
        className="relative group"
      >
        <Avatar className="h-8 w-8 border-2 border-background hover:scale-110 transition-transform cursor-pointer">
          <AvatarFallback className={user.userId === currentUserId ? 'bg-primary text-primary-foreground' : ''}>
            {getUserInitials(user.userName, user.userEmail)}
          </AvatarFallback>
        </Avatar>
        
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {user.userName || user.userEmail}
          {user.userId === currentUserId && ' (you)'}
        </div>
        
      </div>
    ));
  }, [displayUsers, currentUserId]);

  // Memoize overflow component
  const overflowComponent = useMemo(() => {
    if (overflow <= 0) return null;
    
    return (
      <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
        +{overflow}
      </div>
    );
  }, [overflow]);

  return (
    <div className="flex items-center gap-2">
      {/* Active user avatars */}
      <div className="flex -space-x-2">
        {avatarComponents}
        {overflowComponent}
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders when props haven't changed
export const BoardPresence = React.memo(BoardPresenceComponent);