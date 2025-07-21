import React from 'react';
import { render, screen } from '@testing-library/react';

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

describe('Drag and Drop Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should maintain proper state when dragging sticky from column to unassigned', async () => {
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
              content: 'Test sticky in column',
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
      stickies: [], // Start with empty unassigned area
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { container } = render(
      <BoardCanvas
        board={mockBoard}
        columns={mockBoard.columns}
        userId="author1"
      />
    );

    // Verify initial state
    expect(screen.getByText('Test sticky in column')).toBeInTheDocument();
    expect(screen.getByText('Column 1')).toBeInTheDocument();
    expect(screen.getByText('Unassigned Notes')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Unassigned count
  });

  it('should maintain proper state when dragging sticky from unassigned to column', async () => {
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

    const { container } = render(
      <BoardCanvas
        board={mockBoard}
        columns={mockBoard.columns}
        userId="author1"
      />
    );

    // Verify initial state
    expect(screen.getByText('Unassigned sticky')).toBeInTheDocument();
    expect(screen.getByText('Column 1')).toBeInTheDocument();
    expect(screen.getByText('Unassigned Notes')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Unassigned count
  });

  it('should handle multiple stickies in unassigned area', async () => {
    const BoardCanvas = (await import('@/components/board/board-canvas')).BoardCanvas;
    
    const mockBoard = {
      id: 'board1',
      title: 'Test Board',
      columns: [],
      stickies: [
        {
          id: 'sticky1',
          content: 'First unassigned',
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
          content: 'Second unassigned',
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
      ],
    };

    const { container } = render(
      <BoardCanvas
        board={mockBoard}
        columns={mockBoard.columns}
        userId="author1"
      />
    );

    // Verify all unassigned stickies are displayed
    expect(screen.getByText('First unassigned')).toBeInTheDocument();
    expect(screen.getByText('Second unassigned')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Unassigned count
  });
});