import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4321',
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: [
    {
      command: 'npm run preview -- --port 4321',
      url: 'http://127.0.0.1:4321',
      reuseExistingServer: false,
    },
    {
      command: 'node --import tsx scripts/start-test-editor.ts',
      url: 'http://127.0.0.1:4322/login',
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
});
