import { defineConfig, devices } from '@playwright/test'

const PREVIEW_PORT = 4173
const BASE_PATH = '/monitor-sizes/'
const BASE_URL = `http://localhost:${PREVIEW_PORT}${BASE_PATH}`
const IS_CI = Boolean(process.env.CI)

/**
 * Two viewports, both Chromium. Tests tagged `@phone` (cards, sticky visualization on
 * small screens) run only in the phone project, tests tagged `@desktop` (the table) only
 * in the desktop project. Untagged tests run in both. See docs/TESTING.md.
 */
const DESKTOP = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
const PHONE = { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  reporter: IS_CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      grepInvert: /@phone/,
      use: DESKTOP,
    },
    {
      name: 'phone',
      grepInvert: /@desktop/,
      use: PHONE,
    },
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PREVIEW_PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120000,
  },
})
