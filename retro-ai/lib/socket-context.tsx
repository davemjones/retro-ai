"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface MovementEvent {
  stickyId: string;
  columnId: string | null;
  positionX?: number;
  positionY?: number;
  boardId?: string;
  userId: string;
  timestamp: number;
}

interface EditingEvent {
  stickyId: string;
  userId: string;
  userName: string;
  action: 'start' | 'stop';
  timestamp: number;
}

interface UserEvent {
  userId: string;
  userName: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  emitStickyMoved: (data: Omit<MovementEvent, 'userId' | 'timestamp'>) => void;
  emitEditingStart: (stickyId: string, boardId?: string) => void;
  emitEditingStop: (stickyId: string, boardId?: string) => void;
  onStickyMoved: (callback: (data: MovementEvent) => void) => () => void;
  onEditingStarted: (callback: (data: EditingEvent) => void) => () => void;
  onEditingStopped: (callback: (data: EditingEvent) => void) => () => void;
  onUserConnected: (callback: (data: UserEvent) => void) => () => void;
  onUserDisconnected: (callback: (data: UserEvent) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only initialize socket if user is authenticated
    if (status === "loading") return;
    if (!session?.user) return;

    const initSocket = async () => {
      try {
        // Check if socket server is available
        const response = await fetch("/api/socket");
        
        if (!response.ok) {
          console.log("Socket.io server not available");
          setIsConnected(false);
          return;
        }

        const data = await response.json();
        
        if (data.status === "pending") {
          console.log("Socket.io server initialization pending");
          setIsConnected(false);
          return;
        }
        
        // Create socket connection
        const newSocket = io({
          path: "/api/socket",
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
          console.log('🔌 Connected to Socket.io server');
          setIsConnected(true);
          setSocket(newSocket);
        });

        newSocket.on('disconnect', () => {
          console.log('🔌 Disconnected from Socket.io server');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
        });

        // Set initial socket state
        setSocket(newSocket);
        
      } catch (error) {
        console.error("Failed to initialize socket:", error);
        setIsConnected(false);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        console.log("Cleaning up socket connection");
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [session, status, socket]);

  const joinBoard = (boardId: string) => {
    if (socket && isConnected) {
      socket.emit("join-board", boardId);
    }
  };

  const leaveBoard = (boardId: string) => {
    if (socket && isConnected) {
      socket.emit("leave-board", boardId);
    }
  };

  const emitStickyMoved = (data: Omit<MovementEvent, 'userId' | 'timestamp'>) => {
    if (socket && isConnected) {
      socket.emit("sticky-moved", data);
    }
  };

  const emitEditingStart = (stickyId: string, boardId?: string) => {
    if (socket && isConnected) {
      socket.emit("editing-start", { stickyId, boardId });
    }
  };

  const emitEditingStop = (stickyId: string, boardId?: string) => {
    if (socket && isConnected) {
      socket.emit("editing-stop", { stickyId, boardId });
    }
  };

  const onStickyMoved = (callback: (data: MovementEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("sticky-moved", callback);
    return () => socket.off("sticky-moved", callback);
  };

  const onEditingStarted = (callback: (data: EditingEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("editing-started", callback);
    return () => socket.off("editing-started", callback);
  };

  const onEditingStopped = (callback: (data: EditingEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("editing-stopped", callback);
    return () => socket.off("editing-stopped", callback);
  };

  const onUserConnected = (callback: (data: UserEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("user-connected", callback);
    return () => socket.off("user-connected", callback);
  };

  const onUserDisconnected = (callback: (data: UserEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("user-disconnected", callback);
    return () => socket.off("user-disconnected", callback);
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    joinBoard,
    leaveBoard,
    emitStickyMoved,
    emitEditingStart,
    emitEditingStop,
    onStickyMoved,
    onEditingStarted,
    onEditingStopped,
    onUserConnected,
    onUserDisconnected,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}