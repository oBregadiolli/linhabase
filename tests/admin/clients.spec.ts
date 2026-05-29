import { test, expect } from '@playwright/test'

test.describe('Admin — Clientes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin?tab=clients')
    await page.waitForTimeout(5000)
  })

  test('carrega a tab de clientes sem erros', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('exibe clientes do seed', async ({ page }) => {
    const hasPrincipal = await page.getByText('E2E Cliente Principal').isVisible().catch(() => false)
    const hasSecundario = await page.getByText('E2E Cliente Secundario').isVisible().catch(() => false)
    expect(hasPrincipal || hasSecundario).toBe(true)
  })

  test('exibe estatisticas de clientes', async ({ page }) => {
    // Stats cards: text in DOM is capitalized, shown uppercase via CSS
    const totalCard = page.locator('p', { hasText: 'Total' }).first()
    await expect(totalCard).toBeVisible()
  })

  test('abre modal de novo cliente', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Novo Cliente' })
    await expect(btn).toBeVisible({ timeout: 5_000 })
    await btn.click()
    // Modal shows a textarea or input for description
    await page.waitForTimeout(1000)
    const hasInput = await page.locator('textarea, input[type="text"]').first().isVisible().catch(() => false)
    expect(hasInput).toBe(true)
  })
})

test.describe.serial('Admin — CRUD de Clientes', () => {
  const clientName = `E2E Teste Auto ${Date.now()}`

  // FIXME: Supabase save hangs due to network latency in local environment
  test.fixme('cria novo cliente', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/admin?tab=clients')
    await page.waitForTimeout(5000)

    const btn = page.locator('button', { hasText: /Novo Cliente/ })
    await btn.click()

    const descField = page.locator('textarea').first()
    await expect(descField).toBeVisible({ timeout: 3_000 })
    await descField.fill(clientName)

    await page.locator('button', { hasText: /Criar/ }).click()

    await expect(page.getByText(clientName)).toBeVisible({ timeout: 30_000 })
  })

  // FIXME: Depends on 'cria novo cliente' which is skipped due to network issues
  test.fixme('busca cliente criado', async ({ page }) => {
    await page.goto('/admin?tab=clients')
    await page.waitForTimeout(5000)

    const searchInput = page.locator('input[placeholder*="Buscar"]')
    if (await searchInput.isVisible({ timeout: 3_000 })) {
      await searchInput.fill('E2E Teste Auto')
      await page.waitForTimeout(1000)
      await expect(page.getByText(clientName)).toBeVisible()
    }
  })
})
