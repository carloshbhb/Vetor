import '@testing-library/jest-dom/vitest';

// Mock IntersectionObserver for jsdom
class MockIntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock window.scrollTo
Object.defineProperty(globalThis, 'scrollTo', {
  writable: true,
  value: () => {},
});
