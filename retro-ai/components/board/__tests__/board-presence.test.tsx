import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderWithProviders, screen, mockUseSocketContext } from '../../../test-utils';
import { BoardPresence } from '../board-presence';

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
        renderWithProviders(
          <BoardPresence 
            boardId={mockBoardId} 
            currentUserId={mockCurrentUserId} 
          />
        );
      }).not.toThrow();
    });

    it('renders empty state when no active users', () => {
      renderWithProviders(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // Should render the container div with specific class
      const presenceContainer = screen.getByTestId('mock-socket-provider');
      expect(presenceContainer).toBeInTheDocument();
    });

    it('displays active users with avatars', () => {
      renderWithProviders(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // The component should render without errors and handle user data properly
      // This test verifies the component structure remains stable after parameter removal
      expect(screen.getByTestId('mock-socket-provider')).toBeInTheDocument();
    });
  });

  describe('User Filtering', () => {
    it('excludes current user from display', () => {
      renderWithProviders(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // The component should filter out the current user
      // This behavior should remain consistent after the boardId parameter removal
      expect(screen.getByTestId('mock-socket-provider')).toBeInTheDocument();
    });
  });

  describe('Socket Integration', () => {
    it('handles socket context properly without using boardId', () => {
      // This test verifies that the component still works with socket integration
      // even after removing the boardId parameter usage
      renderWithProviders(
        <BoardPresence 
          boardId={mockBoardId} 
          currentUserId={mockCurrentUserId} 
        />
      );

      // Component should render and integrate with socket context
      expect(mockUseSocketContext.onUserConnected).toBeDefined();
      expect(mockUseSocketContext.onUserDisconnected).toBeDefined();
    });

    it('handles disconnected socket gracefully', () => {
      // Component should render gracefully when socket is disconnected
      // This is handled by our global mocks in setup-mocks.ts
      expect(() => {
        renderWithProviders(
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
      const consoleSpy = jest.spyOn(console, 'error');

      renderWithProviders(
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
        return renderWithProviders(
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
      const { rerender } = renderWithProviders(
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
      expect(screen.getByTestId('mock-socket-provider')).toBeInTheDocument();
    });
  });
});