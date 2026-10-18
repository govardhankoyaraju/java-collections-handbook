import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { progressStore } from '../src/features/progress/useProgress';

// jsdom does not implement scrolling APIs.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
  progressStore.reset();
  localStorage.clear();
});
