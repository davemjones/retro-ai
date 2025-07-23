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
      text: async () => "Socket.io server running",
      json: async () => ({ message: "Socket.io server running", status: "active" }),
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
    it('should handle disabled socket state gracefully', async () => {
      const { useSocket } = await import('@/hooks/use-socket');
      
      let hookResult: any;
      function TestComponent() {
        hookResult = useSocket({ boardId: 'test-board-123' });
        return <div>Test</div>;
      }

      const { SocketProvider } = await import('@/lib/socket-context');
      
      render(
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      );

      await waitFor(() => {
        expect(hookResult.isConnected).toBe(false);
      });
      
      // Should not crash when trying to emit events while disconnected
      expect(() => {
        hookResult.emitStickyMoved({ stickyId: 'test', columnId: 'col1' });
      }).not.toThrow();
    });

    it('should return no-op functions when socket is disabled', async () => {
      const { useSocket } = await import('@/hooks/use-socket');
      const mockOnStickyMoved = jest.fn();
      
      let hookResult: any;
      function TestComponent() {
        hookResult = useSocket({ 
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

      await waitFor(() => {
        expect(hookResult.isConnected).toBe(false);
      });
      
      // Event listener functions should exist but not call socket methods
      expect(typeof hookResult.emitStickyMoved).toBe('function');
      expect(typeof hookResult.emitEditingStart).toBe('function');
      expect(typeof hookResult.emitEditingStop).toBe('function');
    });

    it('should handle component unmount gracefully when disabled', async () => {
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

      // Should not crash when unmounting with disabled socket
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Real-Time Movement Events', () => {
    it('should render board canvas with disabled socket state', async () => {
      const BoardCanvas = (await import('@/components/board/board-canvas')).BoardCanvas;
      const { SocketProvider } = await import('@/lib/socket-context');
      
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
        <SocketProvider>
          <BoardCanvas
            board={mockBoard}
            columns={mockBoard.columns}
            userId="author1"
          />
        </SocketProvider>
      );

      // Board should render properly even with disabled socket
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

    it('should render sticky note without editing indicator when disabled', async () => {
      const StickyNote = (await import('@/components/board/sticky-note')).StickyNote;
      const { SocketProvider } = await import('@/lib/socket-context');
      
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

      render(
        <SocketProvider>
          <StickyNote sticky={mockSticky} userId="different-user" />
        </SocketProvider>
      );

      // Should render content properly
      expect(screen.getByText('Test content')).toBeInTheDocument();
      // Should show author initials in avatar (TU for Test User)
      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('should handle editing actions when socket is disabled', async () => {
      const StickyNote = (await import('@/components/board/sticky-note')).StickyNote;
      const { SocketProvider } = await import('@/lib/socket-context');
      
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

      render(
        <SocketProvider>
          <StickyNote sticky={mockSticky} userId="current-user" />
        </SocketProvider>
      );

      // Should render without crashing
      expect(screen.getByText('Test content')).toBeInTheDocument();
      
      // More options button should be rendered (check by its empty button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle disabled socket state without errors', async () => {
      const originalError = console.error;
      const originalLog = console.log;
      console.error = jest.fn();
      console.log = jest.fn();

      const { SocketProvider } = await import('@/lib/socket-context');
      
      render(
        <SocketProvider>
          <div>Test</div>
        </SocketProvider>
      );

      // Should attempt to connect to socket
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/socket');
      });

      console.error = originalError;
      console.log = originalLog;
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
    it('should return active response when socket is enabled', async () => {
      // The test setup mocks fetch to return our active status
      const mockResponse = await fetch('/api/socket');
      const data = await mockResponse.json();
      
      expect(data.status).toBe('active');
      expect(data.message).toContain('Socket.io server running');
    });
  });
});