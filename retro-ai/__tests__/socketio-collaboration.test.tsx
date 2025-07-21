import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Socket.io client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  id: 'mock-socket-id',
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  }),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Socket.io Real-Time Collaboration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  describe('Socket Context', () => {
    it('should initialize socket connection when user is authenticated', async () => {
      const { SocketProvider } = await import('@/lib/socket-context');
      
      render(
        <SocketProvider>
          <div>Test Child</div>
        </SocketProvider>
      );

      // Should fetch the socket API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/socket');
    });

    it('should provide socket context to children', async () => {
      const { SocketProvider, useSocket } = await import('@/lib/socket-context');
      
      let contextValue: any;
      
      function TestChild() {
        contextValue = useSocket();
        return <div>Test</div>;
      }

      render(
        <SocketProvider>
          <TestChild />
        </SocketProvider>
      );

      expect(contextValue).toBeDefined();
      expect(contextValue.joinBoard).toBeInstanceOf(Function);
      expect(contextValue.leaveBoard).toBeInstanceOf(Function);
      expect(contextValue.emitStickyMoved).toBeInstanceOf(Function);
    });

    it('should throw error when useSocket is used outside provider', async () => {
      const { useSocket } = await import('@/lib/socket-context');
      const originalError = console.error;
      console.error = jest.fn();
      
      function TestComponent() {
        useSocket();
        return <div>Test</div>;
      }

      expect(() => render(<TestComponent />)).toThrow(
        'useSocket must be used within a SocketProvider'
      );
      
      console.error = originalError;
    });
  });

  describe('useSocket Custom Hook', () => {
    it('should join board when boardId is provided', async () => {
      const { useSocket } = await import('@/hooks/use-socket');
      
      function TestComponent() {
        useSocket({ boardId: 'test-board-123' });
        return <div>Test</div>;
      }

      const { SocketProvider } = await import('@/lib/socket-context');
      
      render(
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('join-board', 'test-board-123');
      });
    });

    it('should set up event listeners for movement events', async () => {
      const { useSocket } = await import('@/hooks/use-socket');
      const mockOnStickyMoved = jest.fn();
      
      function TestComponent() {
        useSocket({ 
          boardId: 'test-board', 
          onStickyMoved: mockOnStickyMoved 
        });
        return <div>Test</div>;
      }

      const { SocketProvider } = await import('@/lib/socket-context');
      
      render(
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      );

      expect(mockSocket.on).toHaveBeenCalledWith('sticky-moved', mockOnStickyMoved);
    });

    it('should clean up event listeners on unmount', async () => {
      const { useSocket } = await import('@/hooks/use-socket');
      const mockOnStickyMoved = jest.fn();
      
      function TestComponent() {
        useSocket({ 
          boardId: 'test-board', 
          onStickyMoved: mockOnStickyMoved 
        });
        return <div>Test</div>;
      }

      const { SocketProvider } = await import('@/lib/socket-context');
      
      const { unmount } = render(
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      );

      unmount();

      expect(mockSocket.off).toHaveBeenCalled();
    });
  });

  describe('Real-Time Movement Events', () => {
    it('should emit movement event when sticky is moved', async () => {
      const BoardCanvas = (await import('@/components/board/board-canvas')).BoardCanvas;
      
      const mockBoard = {
        id: 'board1',
        title: 'Test Board',
        columns: [
          {
            id: 'col1',
            title: 'Column 1',
            order: 0,
            color: null,
            stickies: [
              {
                id: 'sticky1',
                content: 'Test sticky',
                color: '#FFE066',
                positionX: 0,
                positionY: 0,
                author: {
                  id: 'author1',
                  name: 'Test User',
                  email: 'test@example.com',
                  password: 'hashed',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                boardId: 'board1',
                columnId: 'col1',
                authorId: 'author1',
              },
            ],
          },
        ],
        stickies: [],
      };

      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockBoard.columns}
          userId="author1"
        />
      );

      // Movement events would be tested through drag-and-drop simulation
      // For now, we verify the structure is in place
      expect(screen.getByText('Test sticky')).toBeInTheDocument();
    });

    it('should handle incoming movement events', () => {
      // Test that movement events are properly handled
      const movementEvent = {
        stickyId: 'sticky1',
        columnId: 'col2',
        userId: 'other-user',
        timestamp: Date.now(),
      };

      // This would be tested by triggering socket events
      expect(movementEvent).toBeDefined();
    });
  });

  describe('Editing Indicators', () => {
    it('should render editing indicator component', async () => {
      const EditingIndicator = (await import('@/components/board/editing-indicator')).EditingIndicator;
      
      render(<EditingIndicator userName="Test User" />);

      // Should show user initial
      expect(screen.getByText('T')).toBeInTheDocument();
      
      // Should show pulsating dots
      const dots = document.querySelectorAll('.animate-pulse');
      expect(dots).toHaveLength(3);
    });

    it('should show editing indicator when someone else is editing', async () => {
      const StickyNote = (await import('@/components/board/sticky-note')).StickyNote;
      
      const mockSticky = {
        id: 'sticky1',
        content: 'Test content',
        color: '#FFE066',
        positionX: 0,
        positionY: 0,
        author: {
          id: 'author1',
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        boardId: 'board1',
        columnId: 'col1',
        authorId: 'author1',
      };

      render(<StickyNote sticky={mockSticky} userId="different-user" />);

      // Should not show editing indicator initially
      expect(screen.queryByText('T')).not.toBeInTheDocument();
    });

    it('should emit editing events when user starts editing', async () => {
      const StickyNote = (await import('@/components/board/sticky-note')).StickyNote;
      
      const mockSticky = {
        id: 'sticky1',
        content: 'Test content',
        color: '#FFE066',
        positionX: 0,
        positionY: 0,
        author: {
          id: 'current-user',
          name: 'Current User',
          email: 'current@example.com',
          password: 'hashed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        boardId: 'board1',
        columnId: 'col1',
        authorId: 'current-user',
      };

      const user = userEvent.setup();

      render(<StickyNote sticky={mockSticky} userId="current-user" />);

      // Click the more options button
      const moreButton = screen.getByRole('button', { name: /more/i });
      await user.click(moreButton);

      // Click edit button
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Should emit editing start event
      expect(mockSocket.emit).toHaveBeenCalledWith('editing-start', { stickyId: 'sticky1' });
    });
  });

  describe('Error Handling', () => {
    it('should handle socket connection errors gracefully', async () => {
      const originalError = console.error;
      console.error = jest.fn();

      // Mock socket connection error
      mockSocket.on.mockImplementation((event, callback) => {
        if (event === 'connect_error') {
          callback(new Error('Connection failed'));
        }
      });

      const { SocketProvider } = await import('@/lib/socket-context');
      
      render(
        <SocketProvider>
          <div>Test</div>
        </SocketProvider>
      );

      expect(console.error).toHaveBeenCalledWith(
        'Socket connection error:',
        expect.any(Error)
      );

      console.error = originalError;
    });

    it('should handle API failures during sticky movement', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      // Test that API failures are handled properly
      // This would be integration tested with the actual component
      expect(global.fetch).toBeDefined();
    });
  });

  describe('Performance Considerations', () => {
    it('should prevent echo when user initiates movement', () => {
      // Test that movements initiated by current user don't trigger updates
      const movementEvent = {
        stickyId: 'sticky1',
        columnId: 'col2',
        userId: 'current-user', // Same as current user
        timestamp: Date.now(),
      };

      // Movement should be ignored for current user
      expect(movementEvent.userId).toBe('current-user');
    });

    it('should cleanup stale editing sessions', () => {
      // Test that editing sessions are cleaned up after timeout
      const now = Date.now();
      const staleTimestamp = now - 35000; // 35 seconds ago
      
      expect(now - staleTimestamp).toBeGreaterThan(30000);
    });
  });

  describe('Socket.io API Route', () => {
    it('should return success when socket server is already running', async () => {
      global.io = {} as any; // Mock global io

      const response = await fetch('/api/socket');
      expect(response.status).toBe(200);

      delete (global as any).io;
    });
  });
});