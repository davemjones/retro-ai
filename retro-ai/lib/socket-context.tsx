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
  sessionId?: string;
}

interface SessionEvent {
  type: 'session-warning' | 'session-update' | 'session-security-alert';
  data: Record<string, unknown>;
  timestamp: number;
}

interface ColumnRenameEvent {
  columnId: string;
  title: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface ColumnDeleteEvent {
  columnId: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sessionId: string | null;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  emitStickyMoved: (data: Omit<MovementEvent, 'userId' | 'timestamp'>) => void;
  emitEditingStart: (stickyId: string, boardId?: string) => void;
  emitEditingStop: (stickyId: string, boardId?: string) => void;
  emitColumnRenamed: (data: Omit<ColumnRenameEvent, 'userId' | 'timestamp'>) => void;
  emitColumnDeleted: (data: Omit<ColumnDeleteEvent, 'userId' | 'timestamp'>) => void;
  sendHeartbeat: () => void;
  forceSessionRefresh: () => void;
  onStickyMoved: (callback: (data: MovementEvent) => void) => () => void;
  onEditingStarted: (callback: (data: EditingEvent) => void) => () => void;
  onEditingStopped: (callback: (data: EditingEvent) => void) => () => void;
  onUserConnected: (callback: (data: UserEvent) => void) => () => void;
  onUserDisconnected: (callback: (data: UserEvent) => void) => () => void;
  onSessionEvent: (callback: (data: SessionEvent) => void) => () => void;
  onColumnRenamed: (callback: (data: ColumnRenameEvent) => void) => () => void;
  onColumnDeleted: (callback: (data: ColumnDeleteEvent) => void) => () => void;
  onAuthFailed: (callback: (data: { reason: string }) => void) => () => void;
  onOperationFailed: (callback: (data: { operation: string; reason: string }) => void) => () => void;
  onAccessDenied: (callback: (data: { resource: string; reason: string }) => void) => () => void;
  onHeartbeatResponse: (callback: (data: { isValid: boolean; sessionId: string; timestamp: number }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only initialize socket if user is authenticated
    if (status === "loading") return;
    if (!session?.user) return;

    const initSocket = async () => {
      try {
        // Create socket connection directly
        const newSocket = io({
          path: "/api/socket",
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
          console.log('🔌 Connected to Socket.io server');
          setIsConnected(true);
          setSocket(newSocket);
          // Use socket.id as initial session ID until server provides a specific one
          setSessionId(newSocket.id || null);
        });

        newSocket.on('disconnect', () => {
          console.log('🔌 Disconnected from Socket.io server');
          setIsConnected(false);
          setSessionId(null);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
          setSessionId(null);
        });

        // Enhanced session event handlers
        newSocket.on('board-joined', (data: { boardId: string; sessionId: string; timestamp: number }) => {
          console.log(`Board joined: ${data.boardId} with session ${data.sessionId}`);
          setSessionId(data.sessionId);
        });

        newSocket.on('auth-failed', (data: { reason: string }) => {
          console.error('Socket authentication failed:', data.reason);
          setIsConnected(false);
          setSessionId(null);
        });

        newSocket.on('session-expired', (data: { reason: string }) => {
          console.warn('Session expired:', data.reason);
          setIsConnected(false);
          setSessionId(null);
          // Optionally trigger a re-authentication or redirect to login
        });

        newSocket.on('session-heartbeat-response', (data: { isValid: boolean; sessionId: string; timestamp: number }) => {
          if (data.isValid) {
            setSessionId(data.sessionId);
          } else {
            console.warn('Session heartbeat failed - session may be invalid');
          }
        });

        newSocket.on('session-refreshed', (data: { sessionId: string; timestamp: number }) => {
          console.log('Session refreshed:', data.sessionId);
          setSessionId(data.sessionId);
        });

        newSocket.on('session-refresh-failed', (data: { reason: string }) => {
          console.error('Session refresh failed:', data.reason);
          setIsConnected(false);
          setSessionId(null);
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
      // Clean up function uses the socket from state
      setSocket((currentSocket) => {
        if (currentSocket) {
          console.log("Cleaning up socket connection");
          currentSocket.disconnect();
        }
        return null;
      });
      setIsConnected(false);
    };
  }, [session, status]);

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

  const emitColumnRenamed = (data: Omit<ColumnRenameEvent, 'userId' | 'timestamp'>) => {
    if (socket && isConnected) {
      socket.emit("column-renamed", data);
    }
  };

  const emitColumnDeleted = (data: Omit<ColumnDeleteEvent, 'userId' | 'timestamp'>) => {
    if (socket && isConnected) {
      socket.emit("column-deleted", data);
    }
  };

  const sendHeartbeat = () => {
    if (socket && isConnected) {
      socket.emit("session-heartbeat");
    }
  };

  const forceSessionRefresh = () => {
    if (socket && isConnected) {
      socket.emit("force-session-refresh");
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

  const onSessionEvent = (callback: (data: SessionEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("session-event", callback);
    return () => socket.off("session-event", callback);
  };

  const onAuthFailed = (callback: (data: { reason: string }) => void) => {
    if (!socket) return () => {};
    
    socket.on("auth-failed", callback);
    return () => socket.off("auth-failed", callback);
  };

  const onOperationFailed = (callback: (data: { operation: string; reason: string }) => void) => {
    if (!socket) return () => {};
    
    socket.on("operation-failed", callback);
    return () => socket.off("operation-failed", callback);
  };

  const onAccessDenied = (callback: (data: { resource: string; reason: string }) => void) => {
    if (!socket) return () => {};
    
    socket.on("access-denied", callback);
    return () => socket.off("access-denied", callback);
  };

  const onHeartbeatResponse = (callback: (data: { isValid: boolean; sessionId: string; timestamp: number }) => void) => {
    if (!socket) return () => {};
    
    socket.on("session-heartbeat-response", callback);
    return () => socket.off("session-heartbeat-response", callback);
  };

  const onColumnRenamed = (callback: (data: ColumnRenameEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("column-renamed", callback);
    return () => socket.off("column-renamed", callback);
  };

  const onColumnDeleted = (callback: (data: ColumnDeleteEvent) => void) => {
    if (!socket) return () => {};
    
    socket.on("column-deleted", callback);
    return () => socket.off("column-deleted", callback);
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    sessionId,
    joinBoard,
    leaveBoard,
    emitStickyMoved,
    emitEditingStart,
    emitEditingStop,
    emitColumnRenamed,
    emitColumnDeleted,
    sendHeartbeat,
    forceSessionRefresh,
    onStickyMoved,
    onEditingStarted,
    onEditingStopped,
    onUserConnected,
    onUserDisconnected,
    onSessionEvent,
    onColumnRenamed,
    onColumnDeleted,
    onAuthFailed,
    onOperationFailed,
    onAccessDenied,
    onHeartbeatResponse,
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