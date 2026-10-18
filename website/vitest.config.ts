import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      // The sandbox/CI runners are small: one worker keeps memory predictable.
      maxWorkers: 1,
      fileParallelism: false,
      // Rendering a full lesson (markdown + syntax highlighting) in jsdom is slow on small CI machines.
      testTimeout: 30_000,
    },
  }),
);
