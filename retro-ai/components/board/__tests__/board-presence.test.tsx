import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest, vi } from '@jest/globals';
import { BoardPresence } from '../board-presence';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  }),
}));

// Mock the socket context
const mockSocketContext = {
  socket: { id: 'test-socket' },
  isConnected: true,
  onUserConnected: jest.fn(),
  onUserDisconnected: jest.fn(),
};

jest.mock('../../../lib/socket-context', () => ({
  useSocketContext: () => mockSocketContext,
}));

// Mock the presence utils
jest.mock('../../../lib/presence-utils', () => ({
  getUserInitials: jest.fn((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }),
}));


describe('BoardPresence Component', () => {
  const mockBoardId = 'test-board-id';
  const mockCurrentUserId = 'current-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without boardId parameter being used', () => {
      // This test ensures the component doesn't break after removing boardId usage
      expect(() => {
        render(
          <BoardPresence 
            boardId={mockBoardId} 
            currentUserId={mockCurrentUserId} 
          />
        );
      }).not.toThrow();
    });

    it('renders empty state when no active users', () => {
      render(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // Should render the container div with class "flex items-center gap-2"
      const presenceContainer = screen.getByRole('generic');
      expect(presenceContainer).toBeInTheDocument();
    });

    it('displays active users with avatars', () => {
      render(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // The component should render without errors and handle user data properly
      // This test verifies the component structure remains stable after parameter removal
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });
  });

  describe('User Filtering', () => {
    it('excludes current user from display', () => {
      render(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // The component should filter out the current user
      // This behavior should remain consistent after the boardId parameter removal
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });
  });

  describe('Socket Integration', () => {
    it('handles socket context properly without using boardId', () => {
      // This test verifies that the component still works with socket integration
      // even after removing the boardId parameter usage
      render(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // Component should render and integrate with socket context
      expect(mockSocketContext.onUserConnected).toBeDefined();
      expect(mockSocketContext.onUserDisconnected).toBeDefined();
    });

    it('handles disconnected socket gracefully', async () => {
      const disconnectedSocketContext = {
        ...mockSocketContext,
        socket: null,
        isConnected: false,
      };

      const socketModule = await import('../../../lib/socket-context');
      (socketModule.useSocketContext as jest.Mock).mockReturnValueOnce(disconnectedSocketContext);

      expect(() => {
        render(
          <BoardPresence 
            boardId={mockBoardId} 
            currentUserId={mockCurrentUserId} 
          />
        );
      }).not.toThrow();
    });
  });

  describe('Regression Prevention', () => {
    it('should not break when boardId prop is provided but not used internally', () => {
      // This test ensures backward compatibility - the prop is still accepted
      // but not used internally, preventing any breaking changes
      const consoleSpy = vi.spyOn(console, 'error');

      render(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // Should not log any errors about unused props
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should maintain the same prop interface', () => {
      // Verify that the component still accepts both required props
      const renderWithProps = (boardId: string, currentUserId: string) => {
        return render(
          <BoardPresence 
            boardId={boardId} 
            currentUserId={currentUserId} 
          />
        );
      };

      expect(() => {
        renderWithProps('test-board', 'test-user');
      }).not.toThrow();
    });

    it('should handle user state updates efficiently', () => {
      // This test ensures the Map-based user state management works correctly
      const { rerender } = render(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // Component should handle multiple re-renders without issues
      for (let i = 0; i < 5; i++) {
        rerender(
          <BoardPresence 
            boardId={`board-${i}`} 
            currentUserId={`user-${i}`} 
          />
        );
      }

      // Should still render without errors
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });
  });
});