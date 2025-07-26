/**
 * Integration tests for column creation restrictions (Issue #126)
 * Tests both UI restrictions and business logic
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BoardCanvas } from '../components/board/board-canvas';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock socket hook
jest.mock('../hooks/use-socket', () => ({
  useSocket: () => ({
    emitStickyMoved: jest.fn(),
    emitStickyCreated: jest.fn(),
    emitStickyUpdated: jest.fn(),
    emitStickyDeleted: jest.fn(),
    emitColumnRenamed: jest.fn(),
    emitColumnDeleted: jest.fn(),
    emitEditingStart: jest.fn(),
    emitEditingStop: jest.fn(),
    onStickyMoved: () => () => {},
    onStickyCreated: () => () => {},
    onStickyUpdated: () => () => {},
    onStickyDeleted: () => () => {},
    onColumnRenamed: () => () => {},
    onColumnDeleted: () => () => {},
    onEditingStart: () => () => {},
    onEditingStop: () => () => {},
  }),
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

// Mock child components but preserve their key functionality
jest.mock('../components/board/column', () => ({
  Column: ({ column, isOwner }: { column: any; isOwner: boolean }) => (
    <div data-testid={`column-${column.id}`} data-is-owner={isOwner}>
      {column.title}
    </div>
  ),
}));

// Mock dialogs with state tracking
let createColumnDialogOpen = false;
jest.mock('../components/board/create-column-dialog', () => ({
  CreateColumnDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    createColumnDialogOpen = open;
    return open ? (
      <div data-testid="create-column-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
        Create Column Dialog
      </div>
    ) : null;
  },
}));

jest.mock('../components/board/create-sticky-dialog', () => ({
  CreateStickyDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="create-sticky-dialog">Create Sticky Dialog</div> : null,
}));

jest.mock('../components/board/unassigned-area', () => ({
  UnassignedArea: () => <div data-testid="unassigned-area">Unassigned Area</div>,
}));

describe('Column Creation Restrictions - Integration Tests', () => {
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
    {
      id: 'column-2', 
      title: 'In Progress',
      order: 1,
      color: '#3B82F6',
      stickies: [],
    },
  ];

  beforeEach(() => {
    createColumnDialogOpen = false;
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Board Owner Permissions', () => {
    const ownerId = 'owner-123';

    it('should show Add Column button for board owner', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={ownerId}
          isOwner={true}
        />
      );

      const addColumnButton = screen.getByRole('button', { name: /add column/i });
      expect(addColumnButton).toBeInTheDocument();
      expect(addColumnButton).toBeVisible();
    });

    it('should allow board owner to open create column dialog', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={ownerId}
          isOwner={true}
        />
      );

      const addColumnButton = screen.getByRole('button', { name: /add column/i });
      fireEvent.click(addColumnButton);

      expect(screen.getByTestId('create-column-dialog')).toBeInTheDocument();
    });

    it('should pass isOwner=true to Column components for board owner', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={ownerId}
          isOwner={true}
        />
      );

      const column1 = screen.getByTestId('column-column-1');
      const column2 = screen.getByTestId('column-column-2');
      
      expect(column1).toHaveAttribute('data-is-owner', 'true');
      expect(column2).toHaveAttribute('data-is-owner', 'true');
    });
  });

  describe('Non-Owner Permissions', () => {
    const memberId = 'member-456';

    it('should hide Add Column button for non-owner team members', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={memberId}
          isOwner={false}
        />
      );

      const addColumnButton = screen.queryByRole('button', { name: /add column/i });
      expect(addColumnButton).not.toBeInTheDocument();
    });

    it('should not allow non-owners to access column creation functionality', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={memberId}
          isOwner={false}
        />
      );

      // Should not have any way to create columns
      expect(screen.queryByTestId('create-column-dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add column/i })).not.toBeInTheDocument();
    });

    it('should pass isOwner=false to Column components for non-owners', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={memberId}
          isOwner={false}
        />
      );

      const column1 = screen.getByTestId('column-column-1');
      const column2 = screen.getByTestId('column-column-2');
      
      expect(column1).toHaveAttribute('data-is-owner', 'false');
      expect(column2).toHaveAttribute('data-is-owner', 'false');
    });

    it('should still allow access to all other board functionality', () => {
      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId={memberId}
          isOwner={false}
        />
      );

      // Should still have access to:
      // - View columns
      expect(screen.getByTestId('column-column-1')).toBeInTheDocument();
      expect(screen.getByTestId('column-column-2')).toBeInTheDocument();
      
      // - Unassigned area
      expect(screen.getByTestId('unassigned-area')).toBeInTheDocument();
      
      // Note: Create note button has been moved to header (Issue #156)
      // BoardCanvas no longer contains the floating add note button
      // Non-owners can still interact with all board content
    });
  });

  describe('UI Consistency', () => {
    it('should maintain proper layout without Add Column button', () => {
      const { rerender } = render(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId="owner-123"
          isOwner={true}
        />
      );

      // Get initial layout with Add Column button
      const hasAddColumnButton = screen.queryByRole('button', { name: /add column/i });
      expect(hasAddColumnButton).toBeInTheDocument();

      // Re-render for non-owner
      rerender(
        <BoardCanvas
          board={mockBoard}
          columns={mockColumns}
          userId="member-456"
          isOwner={false}
        />
      );

      // Layout should still be intact, just without Add Column button
      expect(screen.getByTestId('column-column-1')).toBeInTheDocument();
      expect(screen.getByTestId('column-column-2')).toBeInTheDocument();
      expect(screen.getByTestId('unassigned-area')).toBeInTheDocument();
      
      // Add Column button should be gone
      expect(screen.queryByRole('button', { name: /add column/i })).not.toBeInTheDocument();
    });
  });

  describe('Business Logic Validation', () => {
    it('should enforce proper permission model', () => {
      // Test that the component correctly interprets isOwner prop
      const testCases = [
        { isOwner: true, shouldShowAddColumn: true },
        { isOwner: false, shouldShowAddColumn: false },
      ];

      testCases.forEach(({ isOwner, shouldShowAddColumn }) => {
        const { unmount } = render(
          <BoardCanvas
            board={mockBoard}
            columns={mockColumns}
            userId="test-user"
            isOwner={isOwner}
          />
        );

        const addColumnButton = screen.queryByRole('button', { name: /add column/i });
        
        if (shouldShowAddColumn) {
          expect(addColumnButton).toBeInTheDocument();
        } else {
          expect(addColumnButton).not.toBeInTheDocument();
        }

        unmount();
      });
    });
  });
});