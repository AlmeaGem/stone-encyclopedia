import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'prototype.spec.js',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4177',
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: {
    command: 'node prototype/diagnosis-v3/server.mjs',
    url: 'http://127.0.0.1:4177/',
    reuseExistingServer: false,
    cwd: '../..',
  },
});
