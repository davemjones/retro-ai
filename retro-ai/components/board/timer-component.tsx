"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Play, Pause, Square, Clock } from "lucide-react";
import { useSocket } from "@/lib/socket-context";

interface TimerState {
  duration: number;           // Total duration in milliseconds
  remainingTime: number;      // Current remaining time in milliseconds
  isRunning: boolean;         // Timer active state
  startTime?: number;         // Server timestamp when started
  endTime?: number;          // Calculated end time
}

interface TimerEvent {
  duration: number;
  startTime?: number;
  endTime?: number;
  isRunning: boolean;
  boardId: string;
  userId: string;
  userName: string;
  timestamp: number;
}

interface BoardTimerProps {
  boardId: string;
  userId: string;
}

// Predefined timer durations in minutes
const TIMER_DURATIONS = [
  { label: "1 min", value: 1 },
  { label: "2 min", value: 2 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
];

export function BoardTimer({ boardId, userId }: BoardTimerProps) {
  const [timerState, setTimerState] = useState<TimerState>({
    duration: 5 * 60 * 1000, // Default 5 minutes in milliseconds
    remainingTime: 5 * 60 * 1000,
    isRunning: false,
  });
  
  const [selectedDuration, setSelectedDuration] = useState("5"); // Duration in minutes
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Track if timer is paused
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const socketContext = useSocket();

  // Format time display (MM:SS)
  const formatTime = useCallback((timeInMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(timeInMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle countdown updates
  const updateCountdown = useCallback(() => {
    if (!timerState.isRunning || !timerState.endTime) return;

    const now = Date.now();
    const remaining = Math.max(0, timerState.endTime - now);
    
    setTimerState(prev => ({
      ...prev,
      remainingTime: remaining
    }));

    // Timer completed - auto-reset for better UX
    if (remaining === 0) {
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        remainingTime: prev.duration, // Reset to full duration
        startTime: undefined,
        endTime: undefined,
      }));
      
      setIsPaused(false); // Clear any paused state
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [timerState.isRunning, timerState.endTime]);

  // Set up interval for countdown updates
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(updateCountdown, 100); // Update every 100ms for smooth display
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, updateCountdown]);

  // Socket event handlers
  useEffect(() => {
    if (!socketContext.socket) return;

    const handleTimerSet = (data: TimerEvent) => {
      // Don't update if this event came from us
      if (data.userId === userId) return;

      setTimerState({
        duration: data.duration,
        remainingTime: data.duration,
        isRunning: false,
      });
      
      // Update selected duration in UI
      const durationMinutes = Math.floor(data.duration / (60 * 1000));
      setSelectedDuration(durationMinutes.toString());
    };

    const handleTimerStarted = (data: TimerEvent) => {
      const now = Date.now();
      const endTime = data.startTime! + data.duration;
      const remaining = Math.max(0, endTime - now);

      setTimerState({
        duration: data.duration,
        remainingTime: remaining,
        isRunning: true,
        startTime: data.startTime,
        endTime: endTime,
      });
    };

    const handleTimerPaused = () => {
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        startTime: undefined,
        endTime: undefined,
      }));
      setIsPaused(true); // Set paused state
    };

    const handleTimerStopped = () => {
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        remainingTime: prev.duration, // Always reset to full duration
        startTime: undefined,
        endTime: undefined,
      }));
      setIsPaused(false); // Clear paused state
    };

    // Set up socket listeners
    const unsubscribeSet = socketContext.onTimerSet?.(handleTimerSet) || (() => {});
    const unsubscribeStarted = socketContext.onTimerStarted?.(handleTimerStarted) || (() => {});
    const unsubscribePaused = socketContext.onTimerPaused?.(handleTimerPaused) || (() => {});
    const unsubscribeStopped = socketContext.onTimerStopped?.(handleTimerStopped) || (() => {});

    return () => {
      unsubscribeSet();
      unsubscribeStarted();
      unsubscribePaused();
      unsubscribeStopped();
    };
  }, [socketContext, userId]);

  // Handle duration change
  const handleDurationChange = useCallback((durationMinutes: string) => {
    if (timerState.isRunning) return; // Don't allow changes while running

    const durationMs = parseInt(durationMinutes) * 60 * 1000;
    setSelectedDuration(durationMinutes);
    
    const newTimerState = {
      duration: durationMs,
      remainingTime: durationMs,
      isRunning: false,
    };
    
    setTimerState(newTimerState);
    
    // Emit socket event
    if (socketContext.isConnected && socketContext.emitTimerSet) {
      socketContext.emitTimerSet({
        duration: durationMs,
        boardId,
      });
    }
  }, [timerState.isRunning, boardId, socketContext]);

  // Handle start/resume timer
  const handleStart = useCallback(() => {
    if (timerState.isRunning) return;

    const now = Date.now();
    const durationToUse = isPaused ? timerState.remainingTime : timerState.duration;
    const endTime = now + durationToUse;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      startTime: now,
      endTime: endTime,
      remainingTime: durationToUse,
    }));
    
    setIsPaused(false); // Clear paused state

    // Emit socket event
    if (socketContext.isConnected && socketContext.emitTimerStarted) {
      socketContext.emitTimerStarted({
        duration: durationToUse,
        startTime: now,
        boardId,
      });
    }
  }, [timerState.isRunning, timerState.duration, timerState.remainingTime, isPaused, boardId, socketContext]);

  // Handle stop timer (completely reset)
  const handleStop = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      remainingTime: prev.duration, // Reset to full duration
      startTime: undefined,
      endTime: undefined,
    }));
    
    setIsPaused(false); // Clear paused state

    // Emit socket event
    if (socketContext.isConnected && socketContext.emitTimerStopped) {
      socketContext.emitTimerStopped({
        boardId,
      });
    }
  }, [boardId, socketContext]);

  // Handle pause (stops timer but keeps remaining time)
  const handlePause = useCallback(() => {
    if (!timerState.isRunning) return;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      startTime: undefined,
      endTime: undefined,
    }));
    
    setIsPaused(true); // Set paused state

    // Emit socket event for synchronized pause
    if (socketContext.isConnected && socketContext.emitTimerPaused) {
      socketContext.emitTimerPaused({
        boardId,
      });
    }
  }, [timerState.isRunning, boardId, socketContext]);

  const isTimerCompleted = timerState.remainingTime === 0;
  const canStart = !timerState.isRunning && !isPaused && timerState.remainingTime > 0;
  const canResume = !timerState.isRunning && isPaused && timerState.remainingTime > 0;
  const canPause = timerState.isRunning;
  const canStop = timerState.isRunning || isPaused || timerState.remainingTime !== timerState.duration;

  if (isExpanded) {
    return (
      <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-2 border">
        {/* Duration Selector */}
        <Select 
          value={selectedDuration} 
          onValueChange={handleDurationChange}
          disabled={timerState.isRunning || isPaused}
        >
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMER_DURATIONS.map(duration => (
              <SelectItem key={duration.value} value={duration.value.toString()}>
                {duration.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Timer Display */}
        <div className={`font-mono text-lg font-bold min-w-[60px] text-center ${
          isTimerCompleted ? 'text-red-600 animate-pulse' : 
          timerState.remainingTime <= 20000 ? 'text-red-600' :
          timerState.isRunning ? 'text-green-600' : 'text-foreground'
        }`}>
          {formatTime(timerState.remainingTime)}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-1">
          {canStart && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStart}
              className="h-8 w-8 p-0"
              title="Start Timer"
            >
              <Play className="h-3 w-3" />
            </Button>
          )}
          
          {canResume && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStart}
              className="h-8 w-8 p-0"
              title="Resume Timer"
            >
              <Play className="h-3 w-3" />
            </Button>
          )}
          
          {canPause && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              className="h-8 w-8 p-0"
              title="Pause Timer"
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}

          {canStop && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStop}
              className="h-8 w-8 p-0"
              title="Stop & Reset Timer"
            >
              <Square className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Collapse Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded(false)}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
          title="Collapse Timer"
        >
          ×
        </Button>
      </div>
    );
  }

  // Collapsed view - show icon with time if running or paused
  const showTimeInCollapsed = timerState.isRunning || isPaused;
  const getCollapsedColor = () => {
    if (isTimerCompleted) return 'text-red-600';
    if (timerState.remainingTime <= 20000) return 'text-red-600';
    if (timerState.isRunning) return 'text-green-600';
    if (isPaused) return 'text-yellow-600';
    return 'text-muted-foreground';
  };
  
  const getCollapsedTitle = () => {
    if (showTimeInCollapsed) {
      const status = timerState.isRunning ? 'Timer' : 'Paused';
      return `${status}: ${formatTime(timerState.remainingTime)}`;
    }
    return "Open Timer";
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsExpanded(true)}
      className={`h-8 px-2 ${getCollapsedColor()} hover:text-foreground`}
      title={getCollapsedTitle()}
    >
      <Clock className="h-4 w-4" />
      {showTimeInCollapsed && (
        <span className={`ml-1 font-mono text-xs ${
          timerState.remainingTime <= 20000 && showTimeInCollapsed ? 'text-red-600' : ''
        }`}>
          {formatTime(timerState.remainingTime)}
        </span>
      )}
    </Button>
  );
}