import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BoardTimer } from '../timer-component';

interface TimerEvent {
  duration?: number;
  startTime?: number;
  boardId: string;
  userId: string;
  userName: string;
  timestamp: number;
}

// Mock the socket context
const mockSocketContext = {
  socket: { id: 'test-socket' },
  isConnected: true,
  emitTimerSet: vi.fn(),
  emitTimerStarted: vi.fn(),
  emitTimerStopped: vi.fn(),
  onTimerSet: vi.fn((callback) => {
    mockSocketContext._onTimerSetCallback = callback;
    return () => {}; // unsubscribe function
  }),
  onTimerStarted: vi.fn((callback) => {
    mockSocketContext._onTimerStartedCallback = callback;
    return () => {};
  }),
  onTimerStopped: vi.fn((callback) => {
    mockSocketContext._onTimerStoppedCallback = callback;
    return () => {};
  }),
  _onTimerSetCallback: null as ((data: TimerEvent) => void) | null,
  _onTimerStartedCallback: null as ((data: TimerEvent) => void) | null,
  _onTimerStoppedCallback: null as ((data: TimerEvent) => void) | null,
};

vi.mock('@/lib/socket-context', () => ({
  useSocket: () => mockSocketContext,
}));

// Mock setInterval and clearInterval for timer testing
vi.mock('node:timers', () => ({
  setInterval: vi.fn(),
  clearInterval: vi.fn(),
}));

describe('BoardTimer', () => {
  const mockBoardId = 'test-board-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset socket context callbacks
    mockSocketContext._onTimerSetCallback = null;
    mockSocketContext._onTimerStartedCallback = null;
    mockSocketContext._onTimerStoppedCallback = null;
    
    // Mock Date.now for consistent testing
    vi.spyOn(Date, 'now').mockReturnValue(1000000);
    
    // Mock setInterval to avoid real timers in tests
    vi.spyOn(global, 'setInterval').mockImplementation((callback) => {
      const id = setTimeout(callback, 0); // Execute immediately for testing
      return id as NodeJS.Timeout;
    });
    
    vi.spyOn(global, 'clearInterval').mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('renders collapsed timer by default', () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      // Should show clock icon in collapsed state
      expect(screen.getByRole('button')).toHaveTextContent('');
      expect(screen.getByTitle('Open Timer')).toBeInTheDocument();
    });

    it('expands when clicked', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      const timerButton = screen.getByTitle('Open Timer');
      fireEvent.click(timerButton);
      
      // Should show expanded controls
      await waitFor(() => {
        expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Default 5 minutes
        expect(screen.getByText('05:00')).toBeInTheDocument(); // Default time display
        expect(screen.getByTitle('Start Timer')).toBeInTheDocument();
      });
    });
  });

  describe('Timer Duration Selection', () => {
    it('changes duration and emits socket event', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      // Expand the timer
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      await waitFor(() => {
        const durationSelect = screen.getByDisplayValue('5');
        expect(durationSelect).toBeInTheDocument();
      });

      // Mock the select trigger to avoid complex dropdown testing
      const durationSelect = screen.getByDisplayValue('5');
      
      // Simulate changing to 10 minutes (this would normally be done through the dropdown)
      fireEvent.change(durationSelect, { target: { value: '10' } });

      // Verify socket event was emitted
      expect(mockSocketContext.emitTimerSet).toHaveBeenCalledWith({
        duration: 10 * 60 * 1000, // 10 minutes in milliseconds
        boardId: mockBoardId,
      });
    });

    it('displays correct time format', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      await waitFor(() => {
        // Default 5 minutes should display as 05:00
        expect(screen.getByText('05:00')).toBeInTheDocument();
      });
    });
  });

  describe('Timer Controls', () => {
    it('starts timer and emits socket event', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      await waitFor(() => {
        const startButton = screen.getByTitle('Start Timer');
        expect(startButton).toBeInTheDocument();
        fireEvent.click(startButton);
      });

      expect(mockSocketContext.emitTimerStarted).toHaveBeenCalledWith({
        duration: 5 * 60 * 1000, // 5 minutes in milliseconds
        startTime: 1000000, // Mocked Date.now()
        boardId: mockBoardId,
      });
    });

    it('shows pause button when timer is running', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      await waitFor(() => {
        const startButton = screen.getByTitle('Start Timer');
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByTitle('Pause Timer')).toBeInTheDocument();
        expect(screen.queryByTitle('Start Timer')).not.toBeInTheDocument();
      });
    });

    it('pauses timer and emits stop event', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      // Start timer first
      await waitFor(() => {
        const startButton = screen.getByTitle('Start Timer');
        fireEvent.click(startButton);
      });

      // Then pause it
      await waitFor(() => {
        const pauseButton = screen.getByTitle('Pause Timer');
        fireEvent.click(pauseButton);
      });

      expect(mockSocketContext.emitTimerStopped).toHaveBeenCalledWith({
        boardId: mockBoardId,
      });
    });

    it('stops and resets timer', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      // Start timer first
      await waitFor(() => {
        const startButton = screen.getByTitle('Start Timer');
        fireEvent.click(startButton);
      });

      // Then stop it
      await waitFor(() => {
        const stopButton = screen.getByTitle('Stop & Reset Timer');
        fireEvent.click(stopButton);
      });

      expect(mockSocketContext.emitTimerStopped).toHaveBeenCalledWith({
        boardId: mockBoardId,
      });

      // Timer should reset to full duration
      await waitFor(() => {
        expect(screen.getByText('05:00')).toBeInTheDocument();
      });
    });
  });

  describe('Socket Event Handling', () => {
    it('handles timer-set event from other users', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      // Simulate receiving a timer-set event from another user
      act(() => {
        mockSocketContext._onTimerSetCallback?.({
          duration: 15 * 60 * 1000, // 15 minutes
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: Date.now(),
        });
      });

      fireEvent.click(screen.getByTitle('Open Timer'));

      await waitFor(() => {
        expect(screen.getByText('15:00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15')).toBeInTheDocument();
      });
    });

    it('handles timer-started event and shows countdown', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));

      // Simulate receiving a timer-started event
      act(() => {
        mockSocketContext._onTimerStartedCallback?.({
          duration: 5 * 60 * 1000, // 5 minutes
          startTime: 1000000,
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: 1000000,
        });
      });

      await waitFor(() => {
        // Timer should be running (green color class)
        const timeDisplay = screen.getByText('05:00');
        expect(timeDisplay).toHaveClass('text-green-600');
        expect(screen.getByTitle('Pause Timer')).toBeInTheDocument();
      });
    });

    it('handles timer-stopped event and resets timer', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));

      // Start timer first
      act(() => {
        mockSocketContext._onTimerStartedCallback?.({
          duration: 5 * 60 * 1000,
          startTime: 1000000,
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: 1000000,
        });
      });

      // Then stop it
      act(() => {
        mockSocketContext._onTimerStoppedCallback?.({
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: 1000000,
        });
      });

      await waitFor(() => {
        // Timer should be stopped and reset
        expect(screen.getByText('05:00')).toBeInTheDocument();
        expect(screen.getByTitle('Start Timer')).toBeInTheDocument();
        expect(screen.queryByTitle('Pause Timer')).not.toBeInTheDocument();
      });
    });

    it('ignores events from same user for timer-set', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));

      // Simulate receiving a timer-set event from same user (should be ignored)
      act(() => {
        mockSocketContext._onTimerSetCallback?.({
          duration: 15 * 60 * 1000,
          boardId: mockBoardId,
          userId: mockUserId, // Same user
          userName: 'Test User',
          timestamp: Date.now(),
        });
      });

      await waitFor(() => {
        // Should still show default 5 minutes, not 15
        expect(screen.getByText('05:00')).toBeInTheDocument();
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      });
    });
  });

  describe('Timer State Management', () => {
    it('prevents duration change while timer is running', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      // Start the timer
      await waitFor(() => {
        const startButton = screen.getByTitle('Start Timer');
        fireEvent.click(startButton);
      });

      // Duration selector should be disabled
      await waitFor(() => {
        const durationSelect = screen.getByDisplayValue('5');
        expect(durationSelect).toBeDisabled();
      });
    });

    it('collapses to show running time in collapsed mode', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      // Start the timer
      await waitFor(() => {
        const startButton = screen.getByTitle('Start Timer');
        fireEvent.click(startButton);
      });

      // Collapse the timer
      await waitFor(() => {
        const collapseButton = screen.getByText('×');
        fireEvent.click(collapseButton);
      });

      // Should show time in collapsed mode
      await waitFor(() => {
        const collapsedTimer = screen.getByTitle(/Timer: 05:00/);
        expect(collapsedTimer).toBeInTheDocument();
        expect(collapsedTimer).toHaveTextContent('05:00');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles socket disconnection gracefully', async () => {
      const disconnectedSocketContext = {
        ...mockSocketContext,
        socket: null,
        isConnected: false,
      };

      const { useSocket } = await import('@/lib/socket-context');
      vi.mocked(useSocket).mockReturnValue(disconnectedSocketContext);

      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));
      
      // Should render without errors even when socket is disconnected
      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('handles missing socket event handlers', async () => {
      const minimalSocketContext = {
        ...mockSocketContext,
        onTimerSet: undefined,
        onTimerStarted: undefined,
        onTimerStopped: undefined,
      };

      const { useSocket } = await import('@/lib/socket-context');
      vi.mocked(useSocket).mockReturnValue(minimalSocketContext);

      // Should render without throwing errors
      expect(() => {
        render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      }).not.toThrow();
    });
  });
});