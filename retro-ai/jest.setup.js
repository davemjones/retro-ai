import '@testing-library/jest-dom';

// Import global mocks
import './test-support/setup-mocks';

// Polyfill for Web APIs in Jest/jsdom environment
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Polyfill for crypto.subtle in Jest environment
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto;
}