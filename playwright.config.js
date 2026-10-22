import { defineConfig, devices } from '@playwright/test';
import { PORT } from './scripts/serve.js';

const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests',
  use: { baseURL: BASE_URL },
  webServer: {
    command: 'node scripts/serve.js',
    url: BASE_URL,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
});
