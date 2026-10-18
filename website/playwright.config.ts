import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests against the production build served by `vite preview`.
 * Not run in the authoring sandbox (Linux arm64 without browser system libraries) — see docs/STATUS.md.
 * In CI: npx playwright install --with-deps chromium && npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173/java-collections-handbook/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/java-collections-handbook/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
