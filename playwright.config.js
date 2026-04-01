// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5000',
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 }, // iPhone 14 サイズ
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
  ],
});
