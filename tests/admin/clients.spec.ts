import { test, expect } from '@playwright/test'
import { gotoAdminTab } from '../helpers/navigation'

test.describe('Admin — Clientes', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdminTab(page, 'clients')
  })

  test('carrega a tab de clientes sem erros', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('exibe clientes do seed', async ({ page }) => {
    await expect(page.getByText('E2E Cliente Principal')).toBeVisible({ timeout: 15_000 })
  })

  test('exibe estatisticas de clientes', async ({ page }) => {
    const totalCard = page.locator('p', { hasText: 'Total' }).first()
    await expect(totalCard).toBeVisible()
  })

  test('abre modal de novo cliente', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Novo Cliente' })
    await expect(btn).toBeVisible({ timeout: 5_000 })
    await btn.click()
    await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible({ timeout: 3_000 })
  })
})

test.describe.serial('Admin — CRUD de Clientes', () => {
  const clientName = `E2E Teste Auto ${Date.now()}`

  test('cria novo cliente', async ({ page }) => {
    test.setTimeout(60_000)
    await gotoAdminTab(page, 'clients')

    await page.getByRole('button', { name: 'Novo Cliente' }).click()
    await page.locator('textarea').first().fill(clientName)
    await page.getByRole('button', { name: 'Criar Cliente' }).click()

    await expect(page.getByRole('heading', { name: 'Novo Cliente' })).not.toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 15_000 })
  })

  test('busca cliente criado', async ({ page }) => {
    await gotoAdminTab(page, 'clients')

    const searchInput = page.locator('input[placeholder*="Buscar"]')
    await expect(searchInput).toBeVisible({ timeout: 5_000 })
    await searchInput.fill(clientName)
    await expect(page.locator('table').getByText(clientName, { exact: true })).toBeVisible({ timeout: 15_000 })
  })
})
