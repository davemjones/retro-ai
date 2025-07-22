'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSocket as useSocketContext } from '@/lib/socket-context';
import { 
  ActiveUser, 
  getUserInitials, 
  formatPresenceCount,
  sortUsersByActivity,
  deduplicateUsers,
  getUserPresenceStatus
} from '@/lib/presence-utils';

interface BoardPresenceProps {
  boardId: string;
  currentUserId: string;
}

export function BoardPresence({ boardId, currentUserId }: BoardPresenceProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;

    // Handle user connected event
    const handleUserConnected = (data: {
      userId: string;
      userName: string;
      userEmail: string;
      timestamp: number;
    }) => {
      console.log('User connected:', data);
      
      setActiveUsers(prev => {
        // Remove any existing entry for this user and add the new one
        const filtered = prev.filter(u => u.userId !== data.userId);
        return [...filtered, {
          ...data,
          status: 'active'
        }];
      });
    };

    // Handle user disconnected event
    const handleUserDisconnected = (data: {
      userId: string;
    }) => {
      console.log('User disconnected:', data);
      
      setActiveUsers(prev => prev.filter(u => u.userId !== data.userId));
    };

    // Handle room users event (when joining a board)
    const handleRoomUsers = (users: ActiveUser[]) => {
      console.log('Room users:', users);
      setActiveUsers(users);
    };

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
  }, [socket, boardId]);

  // Update user statuses periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => 
        prev.map(user => ({
          ...user,
          status: getUserPresenceStatus(user.timestamp)
        }))
      );
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Process and sort users
  const processedUsers = sortUsersByActivity(deduplicateUsers(activeUsers));
  const displayUsers = processedUsers.slice(0, 5);
  const overflow = processedUsers.length - 5;

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
            
            {/* Status indicator */}
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
              user.status === 'active' ? 'bg-green-500' : 
              user.status === 'away' ? 'bg-yellow-500' : 
              'bg-gray-400'
            }`} />
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