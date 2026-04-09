import { test, expect } from '@playwright/test'

test.describe('Authorization — Member não acessa Admin', () => {
  test('/admin redireciona member para /dashboard', async ({ page }) => {
    await page.goto('/admin')
    // Member should be redirected to /dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
    // Should NOT be on admin page
    await expect(page).not.toHaveURL(/admin/)
  })

  test('/admin/timesheets redireciona member para /dashboard', async ({ page }) => {
    await page.goto('/admin/timesheets')
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/admin/)
  })

  test('/admin/team redireciona member para /dashboard', async ({ page }) => {
    await page.goto('/admin/team')
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/admin/)
  })

  test('/admin/projects redireciona member para /dashboard', async ({ page }) => {
    await page.goto('/admin/projects')
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
    await expect(page).not.toHaveURL(/admin/)
  })
})
