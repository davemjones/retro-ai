import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toBeDisabled(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value: string | number): R;
      toBeVisible(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

// Extend Jest mocks for Prisma
declare module '@jest/types' {
  namespace Global {
    interface Global {
      __MONGO_URI__: string;
      __MONGO_DB_NAME__: string;
    }
  }
}