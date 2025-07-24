import { BoardData } from '@/components/board/board-canvas';

// Test data factory functions
export const createMockUser = (overrides?: Partial<any>) => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSticky = (overrides?: Partial<any>) => ({
  id: 'sticky-1',
  content: 'Test sticky note',
  color: '#yellow',
  positionX: 100,
  positionY: 100,
  author: createMockUser(),
  editedBy: [],
  editors: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  boardId: 'board-1',
  columnId: null,
  authorId: 'user-1',
  ...overrides,
});

export const createMockColumn = (overrides?: Partial<any>) => ({
  id: 'column-1',
  title: 'Test Column',
  order: 0,
  color: '#blue',
  stickies: [],
  ...overrides,
});

export const createMockBoard = (overrides?: Partial<BoardData>) => ({
  id: 'board-1',
  title: 'Test Board',
  columns: [],
  stickies: [],
  ...overrides,
});

// Board Canvas Props factory
export const createBoardCanvasProps = (overrides?: Partial<any>) => ({
  board: createMockBoard(),
  columns: [],
  userId: 'user-1',
  isOwner: true,
  ...overrides,
});

// Environment variable mocking utilities
export const mockEnvVar = (key: string, value: string) => {
  const originalValue = process.env[key];
  
  beforeEach(() => {
    process.env[key] = value;
  });
  
  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalValue;
    }
  });
};

// NextRequest mocking utility
export const createMockRequest = (overrides?: Partial<any>) => ({
  headers: new Map(),
  url: 'http://localhost:3000',
  method: 'GET',
  ...overrides,
} as any);

// Prisma mock utilities
export const createPrismaMock = () => ({
  userSession: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  sessionActivity: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
});