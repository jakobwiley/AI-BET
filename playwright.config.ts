import { defineConfig, devices } from '@playwright/test';

// Use process.env.PORT by default and fallback to 3000 if not set
const PORT = process.env.PORT || '3000';

// Set webServer.url and use.baseURL with the dynamically assigned port
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e', // Directory containing the tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // Fail build on CI if test.only is left in code
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html', // Generates an HTML report
  use: {
    baseURL: baseURL,
    trace: 'on-first-retry', // Record trace only when retrying a failed test
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // Configure the development server if needed
  webServer: {
    command: 'npm run dev', // Command to start the dev server
    url: baseURL,
    timeout: 120 * 1000, // Timeout for starting the server (120 seconds)
    reuseExistingServer: !process.env.CI, // Reuse dev server when running locally
  },
}); 