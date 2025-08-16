import React from 'react';
import { render } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock session data for tests (Better Auth format)
export const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    image: null,
  },
  session: {
    id: 'session-id',
    userId: 'test-user-id',
    expiresAt: new Date('2099-01-01'),
    token: 'mock-session-token',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ipAddress: '127.0.0.1',
    userAgent: 'test-user-agent',
  },
  expires: '2099-01-01', // Keep for backward compatibility
};

// Mock SessionProvider that doesn't require real authentication
export const MockSessionProvider = ({ children }: { children: React.ReactNode }) => {
  // Simply return children since we're mocking the auth context
  return <>{children}</>;
};

// Mock SocketProvider for testing
export const MockSocketProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-socket-provider">{children}</div>;
};

// Combined test wrapper with all providers
export const TestProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockSessionProvider>
      <MockSocketProvider>
        {children}
      </MockSocketProvider>
    </MockSessionProvider>
  );
};

// Custom render function that includes providers
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(ui, {
    wrapper: TestProviders,
    ...options,
  });
};

// Mock functions for common hooks (Better Auth format)
export const mockUseSession = {
  data: {
    user: mockSession.user,
    session: mockSession.session,
  },
  status: 'authenticated' as const,
  isPending: false,
  error: null,
  update: jest.fn(),
};

export const mockUseSocket = {
  socket: { id: 'test-socket' },
  isConnected: true,
  emitEditingStart: jest.fn(),
  emitEditingStop: jest.fn(),
  emitStickyDeleted: jest.fn(),
  emitTimerSet: jest.fn(),
  emitTimerStarted: jest.fn(),
  emitTimerStopped: jest.fn(),
  emitTimerPaused: jest.fn(),
  onEditingStarted: jest.fn(() => () => {}),
  onEditingStopped: jest.fn(() => () => {}),
  onTimerSet: jest.fn(() => () => {}),
  onTimerStarted: jest.fn(() => () => {}),
  onTimerStopped: jest.fn(() => () => {}),
  onTimerPaused: jest.fn(() => () => {}),
};

export const mockUseSocketContext = {
  socket: { 
    id: 'test-socket',
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isConnected: true,
  onUserConnected: jest.fn(),
  onUserDisconnected: jest.fn(),
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';