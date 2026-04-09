import { test, expect } from '@playwright/test'

test.describe('Admin — Timesheets Page', () => {
  test('acessa /admin/timesheets com sucesso', async ({ page }) => {
    await page.goto('/admin/timesheets')
    // Wait for page to settle — admin pages use server components
    await page.waitForTimeout(5000)
    // Should not show error
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('exibe conteúdo da página admin', async ({ page }) => {
    await page.goto('/admin/timesheets')
    await page.waitForTimeout(5000)
    // The page loaded without crashing
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })
})

test.describe('Admin — Navigação entre seções', () => {
  test('acessa /admin/team', async ({ page }) => {
    await page.goto('/admin/team')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('acessa /admin/projects', async ({ page }) => {
    await page.goto('/admin/projects')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('/admin redireciona para /admin/timesheets', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/admin\/timesheets/, { timeout: 15_000 })
  })
})
