import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// Storage state paths for different user profiles
const ADMIN_AUTH = path.join(__dirname, 'tests', '.auth', 'admin.json')
const MEMBER_AUTH = path.join(__dirname, 'tests', '.auth', 'member.json')

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // ── Auth Setup ─────────────────────────────────────────
    {
      name: 'auth-admin',
      testMatch: /auth\.admin\.setup\.ts/,
    },
    {
      name: 'auth-member',
      testMatch: /auth\.member\.setup\.ts/,
    },

    // ── Admin tests (logged in as admin) ───────────────────
    {
      name: 'admin',
      testDir: './tests/admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_AUTH,
      },
      dependencies: ['auth-admin'],
    },

    // ── Member tests (logged in as member) ─────────────────
    {
      name: 'member',
      testDir: './tests/member',
      use: {
        ...devices['Desktop Chrome'],
        storageState: MEMBER_AUTH,
      },
      dependencies: ['auth-member'],
    },

    // ── Public tests (no authentication) ───────────────────
    {
      name: 'public',
      testDir: './tests/public',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Sobe o dev server automaticamente
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
