import { test, expect } from '@playwright/test'

test.describe('Admin — Gestão de Projetos', () => {
  test('lista projetos existentes', async ({ page }) => {
    await page.goto('/admin/projects')
    await page.waitForTimeout(5000)
    // E2E projects should be visible
    const hasAlpha = await page.getByText('E2E Projeto Alpha').isVisible().catch(() => false)
    const hasBeta = await page.getByText('E2E Projeto Beta').isVisible().catch(() => false)
    expect(hasAlpha || hasBeta).toBe(true)
  })

  test('página carrega sem erros', async ({ page }) => {
    await page.goto('/admin/projects')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })
})
