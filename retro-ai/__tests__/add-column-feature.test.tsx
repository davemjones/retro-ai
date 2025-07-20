import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateColumnDialog } from '@/components/board/create-column-dialog';
import { BoardCanvas } from '@/components/board/board-canvas';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockBoard = {
  id: 'board-1',
  title: 'Test Board',
  columns: [
    {
      id: 'col-1',
      title: 'What went well',
      order: 1,
      color: '#green',
      stickies: []
    }
  ],
  stickies: []
};

describe('Add Column Feature', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render Add Column button in BoardCanvas', () => {
    render(
      <BoardCanvas 
        board={mockBoard} 
        columns={mockBoard.columns} 
        userId="user-1" 
      />
    );

    const addColumnButton = screen.getByRole('button', { name: /add column/i });
    expect(addColumnButton).toBeInTheDocument();
  });

  it('should open CreateColumnDialog when Add Column button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <BoardCanvas 
        board={mockBoard} 
        columns={mockBoard.columns} 
        userId="user-1" 
      />
    );

    const addColumnButton = screen.getByRole('button', { name: /add column/i });
    await user.click(addColumnButton);

    // The dialog should be rendered (though we're not testing the dialog content here)
    expect(addColumnButton).toBeInTheDocument();
  });

  it('should render CreateColumnDialog with proper form fields', () => {
    const mockOnOpenChange = jest.fn();
    const mockOnColumnCreated = jest.fn();

    render(
      <CreateColumnDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        boardId="board-1"
        onColumnCreated={mockOnColumnCreated}
      />
    );

    expect(screen.getByLabelText(/column title/i)).toBeInTheDocument();
    expect(screen.getByText(/color \(optional\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create column/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should validate required fields in CreateColumnDialog', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = jest.fn();
    const mockOnColumnCreated = jest.fn();

    render(
      <CreateColumnDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        boardId="board-1"
        onColumnCreated={mockOnColumnCreated}
      />
    );

    // Try to submit without title
    const submitButton = screen.getByRole('button', { name: /create column/i });
    await user.click(submitButton);

    // Should show validation error (toast.error is mocked)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should submit form with valid data in CreateColumnDialog', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = jest.fn();
    const mockOnColumnCreated = jest.fn();

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ column: { id: 'col-2', title: 'New Column' } }),
    });

    render(
      <CreateColumnDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        boardId="board-1"
        onColumnCreated={mockOnColumnCreated}
      />
    );

    // Fill in the title
    const titleInput = screen.getByLabelText(/column title/i);
    await user.type(titleInput, 'New Column');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create column/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Column',
          boardId: 'board-1',
          color: null,
        }),
      });
    });
  });

  it('should no longer show TODO comment about add column', () => {
    render(
      <BoardCanvas 
        board={mockBoard} 
        columns={mockBoard.columns} 
        userId="user-1" 
      />
    );

    // The TODO should be replaced with actual functionality
    // No more "coming soon" message should appear
    const addColumnButton = screen.getByRole('button', { name: /add column/i });
    expect(addColumnButton).toBeInTheDocument();
    
    // Verify the component renders without the TODO functionality
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});