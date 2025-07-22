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
  const { socket } = useSocketContext();

  // Memoize event handlers to prevent recreating them on every render
  const handleUserConnected = useCallback((data: {
    userId: string;
    userName: string;
    userEmail: string;
    timestamp: number;
  }) => {
    console.log('User connected:', data);
    
    setActiveUsers(prev => {
      // Remove any existing entry for this user and add the new one
      const filtered = prev.filter(u => u.userId !== data.userId);
      return [...filtered, data];
    });
  }, []);

  const handleUserDisconnected = useCallback((data: {
    userId: string;
  }) => {
    console.log('User disconnected:', data);
    
    setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
  }, []);

  const handleRoomUsers = useCallback((users: ActiveUser[]) => {
    console.log('Room users:', users);
    setActiveUsers(users);
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Subscribe to events
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('room-users', handleRoomUsers);

    // Join the board room
    socket.emit('join-board', boardId);

    // Cleanup
    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('room-users', handleRoomUsers);
    };
  }, [socket, boardId, handleUserConnected, handleUserDisconnected, handleRoomUsers]);

  // Note: Removed periodic status updates - users in presence list are considered active
  // Real activity tracking would require heartbeat/interaction monitoring

  // Memoize processed users to prevent unnecessary re-calculations
  const { displayUsers, overflow } = useMemo(() => {
    const processedUsers = sortUsersByActivity(deduplicateUsers(activeUsers));
    const displayUsers = processedUsers.slice(0, 5);
    const overflow = Math.max(0, processedUsers.length - 5);
    
    return { displayUsers, overflow };
  }, [activeUsers]);

  return (
    <div className="flex items-center gap-2">
      {/* Active user avatars */}
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
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
        ))}
        
        {/* Overflow indicator */}
        {overflow > 0 && (
          <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
            +{overflow}
          </div>
        )}
      </div>
      
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders when props haven't changed
export const BoardPresence = React.memo(BoardPresenceComponent);