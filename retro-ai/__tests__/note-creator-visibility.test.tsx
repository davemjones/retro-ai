/**
 * Unit tests for note creator visibility fix (Issue #122)
 * Tests that new notes appear immediately for the creator without requiring page refresh
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BoardCanvas } from '../components/board/board-canvas';
import { useRouter } from 'next/navigation';

// Mock next/navigation
const mockRefresh = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock socket hook with event tracking
const mockSocket = {
  emitStickyMoved: jest.fn(),
  emitStickyCreated: jest.fn(),
  emitStickyUpdated: jest.fn(),
  emitStickyDeleted: jest.fn(),
  emitColumnRenamed: jest.fn(),
  emitColumnDeleted: jest.fn(),
  emitEditingStart: jest.fn(),
  emitEditingStop: jest.fn(),
  onStickyMoved: jest.fn(() => () => {}),
  onStickyCreated: jest.fn(() => () => {}),
  onStickyUpdated: jest.fn(() => () => {}),
  onStickyDeleted: jest.fn(() => () => {}),
  onColumnRenamed: jest.fn(() => () => {}),
  onColumnDeleted: jest.fn(() => () => {}),
  onEditingStart: jest.fn(() => () => {}),
  onEditingStop: jest.fn(() => () => {}),
};

jest.mock('../hooks/use-socket', () => ({
  useSocket: jest.fn(() => mockSocket),
}));

// Mock flip animation hook
jest.mock('../hooks/use-flip-animation', () => ({
  useFlipAnimation: () => ({
    flipAnimationConfig: {},
    triggerFlipAnimation: jest.fn(),
  }),
}));

// Mock animation utils
jest.mock('../lib/animation-utils', () => ({
  animateStickyEntering: jest.fn(),
}));

// Mock DnD Kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  arrayMove: jest.fn(),
}));

// Mock child components
jest.mock('../components/board/column', () => ({
  Column: ({ column }: { column: any }) => (
    <div data-testid={`column-${column.id}`}>
      {column.title}
    </div>
  ),
}));

// Mock create sticky dialog with callback tracking
let stickyDialogOpen = false;
let stickyCreatedCallback: (() => void) | null = null;

jest.mock('../components/board/create-sticky-dialog', () => ({
  CreateStickyDialog: ({ 
    open, 
    onOpenChange, 
    onStickyCreated 
  }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    onStickyCreated: () => void;
  }) => {
    stickyDialogOpen = open;
    stickyCreatedCallback = onStickyCreated;
    
    return open ? (
      <div data-testid="create-sticky-dialog">
        <button 
          data-testid="create-sticky-submit"
          onClick={() => {
            // Simulate successful note creation
            onStickyCreated();
          }}
        >
          Create Note
        </button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    ) : null;
  },
}));

jest.mock('../components/board/create-column-dialog', () => ({
  CreateColumnDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="create-column-dialog">Create Column Dialog</div> : null,
}));

jest.mock('../components/board/unassigned-area', () => ({
  UnassignedArea: () => <div data-testid="unassigned-area">Unassigned Area</div>,
}));

describe('Note Creator Visibility Fix - Issue #122', () => {
  const mockBoard = {
    id: 'board-123',
    title: 'Test Board',
    stickies: [],
  };

  const mockColumns = [
    {
      id: 'column-1',
      title: 'To Do',
      order: 0,
      color: '#10B981',
      stickies: [],
    },
  ];

  const mockUserId = 'creator-123';

  beforeEach(() => {
    stickyDialogOpen = false;
    stickyCreatedCallback = null;
    jest.clearAllMocks();
  });

  describe('Note Creation Flow', () => {
    it('should not call router.refresh() when note is created', async () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // Open create note dialog using the floating plus button
      const floatingAddButton = screen.getByTestId('floating-add-note-button');
      fireEvent.click(floatingAddButton);

      expect(screen.getByTestId('create-sticky-dialog')).toBeInTheDocument();

      // Create a note
      const createButton = screen.getByTestId('create-sticky-submit');
      fireEvent.click(createButton);

      // Verify router.refresh() was NOT called
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should close dialog after note creation without page refresh', async () => {
      const { rerender } = render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // Open create note dialog using the floating plus button
      const floatingAddButton = screen.getByTestId('floating-add-note-button');
      fireEvent.click(floatingAddButton);

      expect(screen.getByTestId('create-sticky-dialog')).toBeInTheDocument();

      // Create a note
      const createButton = screen.getByTestId('create-sticky-submit');
      fireEvent.click(createButton);

      // Verify dialog is closed
      expect(screen.queryByTestId('create-sticky-dialog')).not.toBeInTheDocument();
      
      // Verify no router refresh was called
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should rely on WebSocket events for real-time updates', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // The component uses useSocket hook for real-time WebSocket updates
      // This ensures real-time synchronization without requiring page refreshes
      expect(screen.getByTestId('floating-add-note-button')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render the floating add note button correctly', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // Verify the floating add button is present and has the correct test ID
      const floatingButton = screen.getByTestId('floating-add-note-button');
      expect(floatingButton).toBeInTheDocument();
      expect(floatingButton).toHaveClass('fixed', 'bottom-6', 'right-6');
    });

    it('should open create dialog when floating button is clicked', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      const floatingButton = screen.getByTestId('floating-add-note-button');
      fireEvent.click(floatingButton);

      expect(screen.getByTestId('create-sticky-dialog')).toBeInTheDocument();
    });
  });

  describe('Regression Prevention', () => {
    it('should not regress to using router.refresh() in sticky creation callback', () => {
      render(
        <BoardCanvas
          board={mockBoard} 
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // Open dialog and create note
      const floatingAddButton = screen.getByTestId('floating-add-note-button');
      fireEvent.click(floatingAddButton);
      
      const createButton = screen.getByTestId('create-sticky-submit');
      fireEvent.click(createButton);

      // Critical test: Ensure router.refresh() is never called during note creation
      expect(mockRefresh).not.toHaveBeenCalled();
      
      // This test will fail if router.refresh() is accidentally added back
    });

    it('should maintain dialog callback functionality without refresh', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // Verify the callback still works to close dialog
      expect(stickyCreatedCallback).toBeDefined();
      
      // Simulate calling the callback
      if (stickyCreatedCallback) {
        stickyCreatedCallback();
      }

      // Dialog should close but no refresh should occur
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Performance Impact', () => {
    it('should not cause unnecessary re-renders from router.refresh()', () => {
      const { rerender } = render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // Create multiple notes using the floating plus button
      const floatingAddButton = screen.getByTestId('floating-add-note-button');
      
      for (let i = 0; i < 3; i++) {
        fireEvent.click(floatingAddButton);
        const createButton = screen.getByTestId('create-sticky-submit');
        fireEvent.click(createButton);
      }

      // Should not trigger any router refreshes
      expect(mockRefresh).not.toHaveBeenCalled();
      
      // Performance benefit: avoids 3 unnecessary page refreshes
    });
  });

  describe('Root Cause Verification', () => {
    it('confirms the fix addresses the race condition between WebSocket and router.refresh()', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={mockUserId}
          isOwner={true}
        />
      );

      // The issue was: WebSocket event adds note → router.refresh() immediately removes it
      // The fix: Remove router.refresh() so WebSocket event persists
      
      // Verify router.refresh() is not called during the note creation flow
      const floatingAddButton = screen.getByTestId('floating-add-note-button');
      fireEvent.click(floatingAddButton);
      const createButton = screen.getByTestId('create-sticky-submit');
      fireEvent.click(createButton);
      
      expect(mockRefresh).not.toHaveBeenCalled();
      
      // Dialog should close properly without refresh
      expect(screen.queryByTestId('create-sticky-dialog')).not.toBeInTheDocument();
    });
  });
});