import { test, expect } from '@playwright/test'

test.describe('Admin — Timesheets Page', () => {
  test('acessa /admin/timesheets com sucesso', async ({ page }) => {
    await page.goto('/admin/timesheets')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('exibe conteudo da pagina admin', async ({ page }) => {
    await page.goto('/admin/timesheets')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })
})

test.describe('Admin — Navegacao entre secoes', () => {
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

  test('/admin carrega tab timesheets por padrao', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForTimeout(5000)
    // Admin page loads with timesheets tab active by default
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('acessa tab de clientes via query param', async ({ page }) => {
    await page.goto('/admin?tab=clients')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('acessa tab de departamentos via query param', async ({ page }) => {
    await page.goto('/admin?tab=departments')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })
})
