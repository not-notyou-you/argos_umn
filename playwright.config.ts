import path from 'node:path';
import { defineConfig } from '@playwright/test';

const PORT = 3100;
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/argos_umn_test';

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  globalSetup: './tests/e2e/setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, screenshot: 'only-on-failure' },
  // Menjalankan build standalone, sama seperti yang berjalan di server.
  webServer: {
    command: 'node tests/e2e/prepare.mjs && node .next/standalone/server.js',
    port: PORT,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      HOSTNAME: 'localhost',
      NODE_ENV: 'production',
      PUBLIC_BASE_URL: `http://localhost:${PORT}`,
      DATABASE_URL: TEST_DATABASE_URL,
      MEDIA_DIR: path.resolve('data/test-media'),
    },
  },
});
