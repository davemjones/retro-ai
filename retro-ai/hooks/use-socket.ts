"use client";

import { useSocket as useSocketContext } from "@/lib/socket-context";
import { useEffect, useRef } from "react";

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

interface ColumnRenameEvent {
  columnId: string;
  title: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface ColumnCreateEvent {
  columnId: string;
  title: string;
  boardId: string;
  order: number;
  color: string | null;
  userId: string;
  userName: string;
  timestamp: number;
}

interface ColumnDeleteEvent {
  columnId: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface StickyUpdateEvent {
  stickyId: string;
  content?: string;
  color?: string;
  boardId: string;
  userId: string;
  editedBy: string[];
  editors?: {
    id: string;
    name: string | null;
    email: string;
  }[];
  timestamp: number;
}

interface StickyCreateEvent {
  stickyId: string;
  content: string;
  color: string;
  boardId: string;
  columnId: string | null;
  positionX: number;
  positionY: number;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
  userId: string;
  timestamp: number;
}

interface StickyDeleteEvent {
  stickyId: string;
  boardId: string;
  userId: string;
  timestamp: number;
}

interface UseSocketOptions {
  boardId?: string;
  onStickyMoved?: (data: MovementEvent) => void;
  onStickyUpdated?: (data: StickyUpdateEvent) => void;
  onStickyCreated?: (data: StickyCreateEvent) => void;
  onStickyDeleted?: (data: StickyDeleteEvent) => void;
  onEditingStarted?: (data: EditingEvent) => void;
  onEditingStopped?: (data: EditingEvent) => void;
  onUserConnected?: (data: UserEvent) => void;
  onUserDisconnected?: (data: UserEvent) => void;
  onColumnCreated?: (data: ColumnCreateEvent) => void;
  onColumnRenamed?: (data: ColumnRenameEvent) => void;
  onColumnDeleted?: (data: ColumnDeleteEvent) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const socketContext = useSocketContext();
  const {
    boardId,
    onStickyMoved,
    onStickyUpdated,
    onStickyCreated,
    onStickyDeleted,
    onEditingStarted,
    onEditingStopped,
    onUserConnected,
    onUserDisconnected,
    onColumnCreated,
    onColumnRenamed,
    onColumnDeleted,
  } = options;

  const currentBoardRef = useRef<string | null>(null);

  // Join/leave board when boardId changes
  useEffect(() => {
    if (!socketContext.isConnected || !boardId) return;

    // Leave current board if switching
    if (currentBoardRef.current && currentBoardRef.current !== boardId) {
      socketContext.leaveBoard(currentBoardRef.current);
    }

    // Join new board
    socketContext.joinBoard(boardId);
    currentBoardRef.current = boardId;

    // Cleanup: leave board when component unmounts or boardId changes
    return () => {
      if (currentBoardRef.current) {
        socketContext.leaveBoard(currentBoardRef.current);
        currentBoardRef.current = null;
      }
    };
  }, [socketContext.isConnected, socketContext.joinBoard, socketContext.leaveBoard, boardId]);

  // Set up event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (onStickyMoved) {
      const unsubscribe = socketContext.onStickyMoved(onStickyMoved);
      unsubscribers.push(unsubscribe);
    }

    if (onStickyUpdated) {
      const unsubscribe = socketContext.onStickyUpdated(onStickyUpdated);
      unsubscribers.push(unsubscribe);
    }

    if (onStickyCreated) {
      const unsubscribe = socketContext.onStickyCreated(onStickyCreated);
      unsubscribers.push(unsubscribe);
    }

    if (onStickyDeleted) {
      const unsubscribe = socketContext.onStickyDeleted(onStickyDeleted);
      unsubscribers.push(unsubscribe);
    }

    if (onEditingStarted) {
      const unsubscribe = socketContext.onEditingStarted(onEditingStarted);
      unsubscribers.push(unsubscribe);
    }

    if (onEditingStopped) {
      const unsubscribe = socketContext.onEditingStopped(onEditingStopped);
      unsubscribers.push(unsubscribe);
    }

    if (onUserConnected) {
      const unsubscribe = socketContext.onUserConnected(onUserConnected);
      unsubscribers.push(unsubscribe);
    }

    if (onUserDisconnected) {
      const unsubscribe = socketContext.onUserDisconnected(onUserDisconnected);
      unsubscribers.push(unsubscribe);
    }

    if (onColumnCreated) {
      const unsubscribe = socketContext.onColumnCreated(onColumnCreated);
      unsubscribers.push(unsubscribe);
    }

    if (onColumnRenamed) {
      const unsubscribe = socketContext.onColumnRenamed(onColumnRenamed);
      unsubscribers.push(unsubscribe);
    }

    if (onColumnDeleted) {
      const unsubscribe = socketContext.onColumnDeleted(onColumnDeleted);
      unsubscribers.push(unsubscribe);
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    socketContext,
    onStickyMoved,
    onStickyUpdated,
    onStickyCreated,
    onStickyDeleted,
    onEditingStarted,
    onEditingStopped,
    onUserConnected,
    onUserDisconnected,
    onColumnCreated,
    onColumnRenamed,
    onColumnDeleted,
  ]);

  return {
    isConnected: socketContext.isConnected,
    emitStickyMoved: socketContext.emitStickyMoved,
    emitStickyUpdated: socketContext.emitStickyUpdated,
    emitStickyCreated: socketContext.emitStickyCreated,
    emitStickyDeleted: socketContext.emitStickyDeleted,
    emitEditingStart: socketContext.emitEditingStart,
    emitEditingStop: socketContext.emitEditingStop,
    emitColumnRenamed: socketContext.emitColumnRenamed,
    emitColumnDeleted: socketContext.emitColumnDeleted,
  };
}