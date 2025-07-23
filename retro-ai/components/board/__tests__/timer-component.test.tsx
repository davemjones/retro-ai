import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BoardTimer } from '../timer-component';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  }),
}));

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

// Mock the socket context
const mockSocketContext = {
  socket: { id: 'test-socket' },
  isConnected: true,
  emitTimerSet: jest.fn(),
  emitTimerStarted: jest.fn(),
  emitTimerStopped: jest.fn(),
  emitTimerPaused: jest.fn(),
  onTimerSet: jest.fn((callback) => {
    mockSocketContext._onTimerSetCallback = callback;
    return () => {}; // unsubscribe function
  }),
  onTimerStarted: jest.fn((callback) => {
    mockSocketContext._onTimerStartedCallback = callback;
    return () => {};
  }),
  onTimerStopped: jest.fn((callback) => {
    mockSocketContext._onTimerStoppedCallback = callback;
    return () => {};
  }),
  onTimerPaused: jest.fn((callback) => {
    mockSocketContext._onTimerPausedCallback = callback;
    return () => {};
  }),
  _onTimerSetCallback: null as ((data: TimerEvent) => void) | null,
  _onTimerStartedCallback: null as ((data: TimerEvent) => void) | null,
  _onTimerStoppedCallback: null as ((data: TimerEvent) => void) | null,
  _onTimerPausedCallback: null as ((data: TimerEvent) => void) | null,
};

jest.mock('../../../lib/socket-context', () => ({
  useSocket: () => mockSocketContext,
}));

// Mock setInterval and clearInterval for timer testing
jest.mock('node:timers', () => ({
  setInterval: jest.fn(),
  clearInterval: jest.fn(),
}));

describe('BoardTimer', () => {
  const mockBoardId = 'test-board-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset socket context callbacks
    mockSocketContext._onTimerSetCallback = null;
    mockSocketContext._onTimerStartedCallback = null;
    mockSocketContext._onTimerStoppedCallback = null;
    mockSocketContext._onTimerPausedCallback = null;
    
    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
    
    // Mock setInterval to avoid real timers in tests
    jest.spyOn(global, 'setInterval').mockImplementation((callback) => {
      const id = setTimeout(callback, 0); // Execute immediately for testing
      return id as NodeJS.Timeout;
    });
    
    jest.spyOn(global, 'clearInterval').mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        isRunning: false,
        startTime: undefined,
        endTime: undefined,
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
        isRunning: true,
        endTime: 1000000 + (5 * 60 * 1000), // startTime + duration
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

    it('pauses timer and emits pause event', async () => {
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

      expect(mockSocketContext.emitTimerPaused).toHaveBeenCalledWith({
        boardId: mockBoardId,
        isRunning: false,
        endTime: undefined,
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
        isRunning: false,
        endTime: undefined,
      });

      // Timer should reset to full duration
      await waitFor(() => {
        expect(screen.getByText('05:00')).toBeInTheDocument();
      });
    });
  });

  describe('Pause Functionality', () => {
    it('handles timer-paused event from other users', async () => {
      render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      
      fireEvent.click(screen.getByTitle('Open Timer'));

      // Start timer first
      act(() => {
        mockSocketContext._onTimerStartedCallback?.({
          duration: 5 * 60 * 1000,
          startTime: 1000000,
          endTime: 1000000 + (5 * 60 * 1000),
          isRunning: true,
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: 1000000,
        });
      });

      await waitFor(() => {
        expect(screen.getByTitle('Pause Timer')).toBeInTheDocument();
      });

      // Then pause it
      act(() => {
        mockSocketContext._onTimerPausedCallback?.({
          duration: 5 * 60 * 1000,
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: 1000000,
          isRunning: false,
          startTime: 1000000,
          endTime: undefined,
        });
      });

      await waitFor(() => {
        // Timer should be paused (shows resume button)
        expect(screen.getByTitle('Resume Timer')).toBeInTheDocument();
        expect(screen.queryByTitle('Pause Timer')).not.toBeInTheDocument();
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
          isRunning: false,
          startTime: undefined,
          endTime: undefined,
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
          endTime: 1000000 + (5 * 60 * 1000),
          isRunning: true,
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
          endTime: 1000000 + (5 * 60 * 1000),
          isRunning: true,
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: 1000000,
        });
      });

      // Then stop it
      act(() => {
        mockSocketContext._onTimerStoppedCallback?.({
          duration: 5 * 60 * 1000,
          boardId: mockBoardId,
          userId: 'other-user',
          userName: 'Other User',
          timestamp: 1000000,
          isRunning: false,
          startTime: undefined,
          endTime: undefined,
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
          isRunning: false,
          startTime: undefined,
          endTime: undefined,
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

      const { useSocket } = await import('../../../lib/socket-context');
      (useSocket as jest.Mock).mockReturnValue(disconnectedSocketContext);

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
        onTimerPaused: undefined,
      };

      const { useSocket } = await import('../../../lib/socket-context');
      (useSocket as jest.Mock).mockReturnValue(minimalSocketContext);

      // Should render without throwing errors
      expect(() => {
        render(<BoardTimer boardId={mockBoardId} userId={mockUserId} />);
      }).not.toThrow();
    });
  });
});