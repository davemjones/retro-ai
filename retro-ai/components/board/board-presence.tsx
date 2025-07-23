"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSocket as useSocketContext } from "@/lib/socket-context";
import { ActiveUser, getUserInitials } from "@/lib/presence-utils";

interface BoardPresenceProps {
  boardId: string;
  currentUserId: string;
}

function BoardPresenceComponent({
  currentUserId,
}: BoardPresenceProps) {
  // Use Map for O(1) add/remove operations - no complex deduplication needed
  const [activeUsers, setActiveUsers] = useState<Map<string, ActiveUser>>(new Map());

  const socketContext = useSocketContext();
  const socket = socketContext.socket;

  // Simple event handlers using Map operations
  const handleUserConnected = useCallback((data: {
    userId: string;
    userName: string;
    userEmail: string;
    timestamp: number;
  }) => {
    setActiveUsers(prev => {
      const newMap = new Map(prev);
      newMap.set(data.userId, data);
      return newMap;
    });
  }, []);

  const handleUserDisconnected = useCallback((data: { userId: string }) => {
    setActiveUsers(prev => {
      const newMap = new Map(prev);
      newMap.delete(data.userId);
      return newMap;
    });
  }, []);

  const handleRoomUsers = useCallback((users: ActiveUser[]) => {
    const userMap = new Map<string, ActiveUser>();
    users.forEach(user => {
      userMap.set(user.userId, user);
    });
    setActiveUsers(userMap);
  }, []);

  // Socket event setup - do NOT call join-board here as other components handle this
  useEffect(() => {
    if (!socket) return;

    socket.on("user-connected", handleUserConnected);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("room-users", handleRoomUsers);

    return () => {
      socket.off("user-connected", handleUserConnected);
      socket.off("user-disconnected", handleUserDisconnected);
      socket.off("room-users", handleRoomUsers);
    };
  }, [socket, handleUserConnected, handleUserDisconnected, handleRoomUsers]);

  // Simple rendering - convert Map to array and render directly
  const users = Array.from(activeUsers.values());
  const displayUsers = users.slice(0, 5);
  const overflow = Math.max(0, users.length - 5);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <div key={user.userId} className="relative group">
            <Avatar className="h-8 w-8 border-2 border-background hover:scale-110 transition-transform cursor-default">
              <AvatarFallback
                className={
                  user.userId === currentUserId
                    ? "bg-primary text-primary-foreground"
                    : ""
                }
              >
                {getUserInitials(user.userName, user.userEmail)}
              </AvatarFallback>
            </Avatar>
            
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {user.userName || user.userEmail}
              {user.userId === currentUserId && " (you)"}
            </div>
          </div>
        ))}
        
        {overflow > 0 && (
          <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}

export const BoardPresence = BoardPresenceComponent;