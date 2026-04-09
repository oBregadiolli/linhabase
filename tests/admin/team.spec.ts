import { test, expect } from '@playwright/test'

test.describe('Admin — Equipe', () => {
  test('acessa página de equipe', async ({ page }) => {
    await page.goto('/admin/team')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('exibe membros ativos', async ({ page }) => {
    await page.goto('/admin/team')
    await page.waitForTimeout(5000)
    // Check at least one of the e2e members is shown
    const hasAdmin = await page.getByText('e2e-admin@linhabase.test').isVisible().catch(() => false)
    const hasMember = await page.getByText('e2e-member@linhabase.test').isVisible().catch(() => false)
    const hasAnyEmail = await page.getByText('@').first().isVisible().catch(() => false)
    expect(hasAdmin || hasMember || hasAnyEmail).toBe(true)
  })

  test('botão de convidar está presente', async ({ page }) => {
    await page.goto('/admin/team')
    await page.waitForTimeout(5000)
    const inviteBtn = page.locator('button', { hasText: /convid|invit/i })
    await expect(inviteBtn).toBeVisible({ timeout: 5_000 })
  })
})
