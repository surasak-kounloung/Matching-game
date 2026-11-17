import { defineConfig } from '@playwright/test';
import { STAGE_VIEWPORT } from './e2e/helpers';

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  use: { baseURL: 'http://localhost:4173', viewport: STAGE_VIEWPORT, deviceScaleFactor: 1 },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
