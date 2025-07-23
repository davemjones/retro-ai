// Global mocks setup for tests
import { jest } from '@jest/globals';
import { mockUseSession, mockUseSocket, mockUseSocketContext } from './test-utils';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => mockUseSession),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock the socket hooks
jest.mock('../hooks/use-socket', () => ({
  useSocket: jest.fn(() => mockUseSocket),
}));

jest.mock('../lib/socket-context', () => ({
  useSocket: jest.fn(() => mockUseSocketContext),
  useSocketContext: jest.fn(() => mockUseSocketContext),
  SocketProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    userSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    board: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    sticky: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    column: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch globally
global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) =>
  Promise.resolve(new Response('{}', {
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
  }))
) as jest.MockedFunction<typeof fetch>;

// Mock DOM APIs that might be missing in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as jest.MockedClass<typeof ResizeObserver>;

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as jest.MockedClass<typeof IntersectionObserver>;