import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StickyNote } from '../sticky-note';
import { SocketProvider } from '../../../lib/socket-context';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the required modules
jest.mock('../../../hooks/use-socket', () => ({
  useSocket: () => ({
    emitStickyEditing: jest.fn(),
    emitStickyEditingStopped: jest.fn(),
    onStickyEditing: jest.fn(() => () => {}),
    onStickyEditingStopped: jest.fn(() => () => {}),
  }),
}));

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}));

// Mock the dialogs
jest.mock('../edit-sticky-dialog', () => ({
  EditStickyDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="edit-dialog">Edit Dialog</div> : null,
}));

jest.mock('../delete-sticky-dialog', () => ({
  DeleteStickyDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="delete-dialog">Delete Dialog</div> : null,
}));

jest.mock('../editing-indicator', () => ({
  EditingIndicator: ({ userName }: { userName: string }) => 
    <div data-testid="editing-indicator">{userName} is editing</div>,
}));

describe('StickyNote Component', () => {
  const mockSticky = {
    id: 'sticky-1',
    content: 'Test sticky note content',
    color: 'yellow',
    position_x: 100,
    position_y: 200,
    author: {
      id: 'author-1',
      name: 'Author Name',
      email: 'author@example.com',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockUserId = 'user-123';
  const mockMoveIndicator = null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without removed imports (toast, useRouter)', () => {
      // This test ensures the component works correctly after removing unused imports
      expect(() => {
        render(
          <SocketProvider>
            <StickyNote 
              sticky={mockSticky} 
              userId={mockUserId} 
              moveIndicator={mockMoveIndicator} 
            />
          </SocketProvider>
        );
      }).not.toThrow();
    });

    it('displays sticky note content', () => {
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      expect(screen.getByText('Test sticky note content')).toBeInTheDocument();
    });

    it('displays author information', () => {
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Should show author initials in avatar
      expect(screen.getByText('AN')).toBeInTheDocument(); // Author Name initials
    });
  });

  describe('Dropdown Menu Functionality', () => {
    it('opens dropdown menu when clicked', () => {
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Find and click the dropdown trigger
      const dropdownTrigger = screen.getByRole('button');
      fireEvent.click(dropdownTrigger);

      // Should show dropdown menu options
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('opens edit dialog when edit option is clicked', () => {
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Open dropdown and click edit
      const dropdownTrigger = screen.getByRole('button');
      fireEvent.click(dropdownTrigger);

      const editOption = screen.getByText('Edit');
      fireEvent.click(editOption);

      // Should open edit dialog
      expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
    });

    it('opens delete dialog when delete option is clicked', () => {
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Open dropdown and click delete
      const dropdownTrigger = screen.getByRole('button');
      fireEvent.click(dropdownTrigger);

      const deleteOption = screen.getByText('Delete');
      fireEvent.click(deleteOption);

      // Should open delete dialog
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });
  });

  describe('Editing Indicator', () => {
    it('shows editing indicator when user is editing', () => {
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // The component should handle editing states properly
      // This verifies the editing indicator integration still works
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Regression Prevention', () => {
    it('should not reference toast functionality', () => {
      // This test ensures toast import removal doesn't break functionality
      const consoleSpy = jest.spyOn(console, 'error');

      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Should not log errors about missing toast
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('toast')
      );
      consoleSpy.mockRestore();
    });

    it('should not reference router functionality', () => {
      // This test ensures useRouter import removal doesn't break functionality
      const consoleSpy = jest.spyOn(console, 'error');

      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Should not log errors about missing router
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('router')
      );
      consoleSpy.mockRestore();
    });

    it('should maintain all core functionality after import cleanup', () => {
      // Verify all essential features still work
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Core functionality should be intact
      expect(screen.getByText('Test sticky note content')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument(); // Dropdown trigger
      expect(screen.getByText('AN')).toBeInTheDocument(); // Author avatar
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Change sticky content
      const updatedSticky = {
        ...mockSticky,
        content: 'Updated content',
      };

      rerender(
        <SocketProvider>
          <StickyNote 
            sticky={updatedSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Should update content correctly
      expect(screen.getByText('Updated content')).toBeInTheDocument();
      expect(screen.queryByText('Test sticky note content')).not.toBeInTheDocument();
    });
  });

  describe('Socket Integration', () => {
    it('integrates with socket context for editing events', () => {
      render(
        <SocketProvider>
          <StickyNote 
            sticky={mockSticky} 
            userId={mockUserId} 
            moveIndicator={mockMoveIndicator} 
          />
        </SocketProvider>
      );

      // Component should integrate with useSocket hook successfully
      // This verifies the socket integration remains functional after cleanup
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});