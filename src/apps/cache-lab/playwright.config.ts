import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'pnpm --filter cache-lab preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
