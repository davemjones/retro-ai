import '@testing-library/jest-dom';

// Polyfill for Web APIs in Jest/jsdom environment
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Polyfill for crypto.subtle in Jest environment
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto;
}