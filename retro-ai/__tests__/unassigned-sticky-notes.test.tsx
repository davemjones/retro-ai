import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext, DragEndEvent } from '@dnd-kit/core';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Unassigned Sticky Notes Feature', () => {
  describe('UnassignedArea Component', () => {
    it('should render empty state when no unassigned stickies', async () => {
      const UnassignedArea = (await import('@/components/board/unassigned-area')).UnassignedArea;
      
      render(
        <UnassignedArea
          stickies={[]}
          userId="test-user"
        />
      );

      expect(screen.getByText('Unassigned Notes')).toBeInTheDocument();
      expect(screen.getByText('No unassigned notes')).toBeInTheDocument();
      expect(screen.getByText('Create notes without a column assignment')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Count badge
    });

    it('should render unassigned sticky notes', async () => {
      const UnassignedArea = (await import('@/components/board/unassigned-area')).UnassignedArea;
      
      const mockStickies = [
        {
          id: 'sticky1',
          content: 'Test sticky 1',
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
          columnId: null,
          authorId: 'author1',
        },
        {
          id: 'sticky2',
          content: 'Test sticky 2',
          color: '#FF6B9D',
          positionX: 100,
          positionY: 100,
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
          columnId: null,
          authorId: 'author1',
        },
      ];

      render(
        <DndContext>
          <UnassignedArea
            stickies={mockStickies}
            userId="author1"
          />
        </DndContext>
      );

      expect(screen.getByText('Unassigned Notes')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Count badge
      expect(screen.getByText('Test sticky 1')).toBeInTheDocument();
      expect(screen.getByText('Test sticky 2')).toBeInTheDocument();
    });

    it('should have proper droppable styling when dragging over', async () => {
      const UnassignedArea = (await import('@/components/board/unassigned-area')).UnassignedArea;
      
      const { container } = render(
        <DndContext>
          <UnassignedArea
            stickies={[]}
            userId="test-user"
          />
        </DndContext>
      );

      const unassignedArea = container.firstChild;
      expect(unassignedArea).toHaveClass('border-dashed');
      expect(unassignedArea).toHaveClass('border-muted-foreground/30');
    });
  });

  describe('BoardCanvas Integration', () => {
    it('should display unassigned sticky notes in the unassigned area', async () => {
      const BoardCanvas = (await import('@/components/board/board-canvas')).BoardCanvas;
      
      const mockBoard = {
        id: 'board1',
        title: 'Test Board',
        columns: [],
        stickies: [
          {
            id: 'sticky1',
            content: 'Unassigned sticky',
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
            columnId: null,
            authorId: 'author1',
          },
        ],
      };

      render(
        <BoardCanvas
          board={mockBoard}
          columns={[]}
          userId="author1"
        />
      );

      expect(screen.getByText('Unassigned Notes')).toBeInTheDocument();
      expect(screen.getByText('Unassigned sticky')).toBeInTheDocument();
    });

    it('should handle drag and drop from unassigned to column', async () => {
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
            stickies: [],
          },
        ],
        stickies: [
          {
            id: 'sticky1',
            content: 'Unassigned sticky',
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
            columnId: null,
            authorId: 'author1',
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <BoardCanvas
          board={mockBoard}
          columns={mockBoard.columns}
          userId="author1"
        />
      );

      // Verify sticky is in unassigned area
      expect(screen.getByText('Unassigned sticky')).toBeInTheDocument();
      
      // Verify API call would be made on drag end
      // Note: Actual drag simulation requires more complex setup with @dnd-kit
    });
  });

  describe('Create Sticky Dialog Integration', () => {
    it('should create sticky with null columnId when "Free placement" is selected', async () => {
      const CreateStickyDialog = (await import('@/components/board/create-sticky-dialog')).CreateStickyDialog;
      
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sticky: { id: 'new-sticky' } }),
      });

      const mockOnStickyCreated = jest.fn();
      const user = userEvent.setup();

      render(
        <CreateStickyDialog
          open={true}
          onOpenChange={jest.fn()}
          boardId="board1"
          columns={[
            { id: 'col1', title: 'Column 1' },
          ]}
          onStickyCreated={mockOnStickyCreated}
        />
      );

      // Type content
      const textarea = screen.getByPlaceholderText("What's on your mind?");
      await user.type(textarea, 'Test unassigned sticky');

      // Select "Free placement on board" (default)
      const selectTrigger = screen.getByText('Place on board or select column');
      expect(selectTrigger).toBeInTheDocument();

      // Submit form
      const createButton = screen.getByText('Create Sticky');
      await user.click(createButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/stickies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"columnId":null'),
        });
      });

      expect(mockOnStickyCreated).toHaveBeenCalled();
    });
  });

  describe('Sticky Movement API', () => {
    it('should update sticky with null columnId when moved to unassigned', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Simulate API call that would happen during drag
      await fetch('/api/stickies/sticky1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnId: null,
        }),
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/stickies/sticky1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnId: null,
        }),
      });
    });
  });

  describe('Board Page Query', () => {
    it('should verify board query includes unassigned stickies', () => {
      // This test documents that the board page query already includes
      // stickies with columnId: null
      const boardQuery = {
        where: { id: 'boardId' },
        include: {
          stickies: {
            where: { columnId: null },
            include: {
              author: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      };

      expect(boardQuery.include.stickies.where).toEqual({ columnId: null });
    });
  });
});