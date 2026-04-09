import { test, expect } from '@playwright/test'

// Helper: open the project select and pick the first available option
async function selectFirstProject(page: import('@playwright/test').Page) {
  const trigger = page.locator('[data-slot="select-trigger"]').first()
  await trigger.click()
  const item = page.locator('[data-slot="select-item"]').first()
  await expect(item).toBeVisible({ timeout: 3_000 })
  await item.click()
}

test.describe('Dashboard — Member', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('exibe dashboard para membro', async ({ page }) => {
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible()
    await expect(page.getByText('Total:')).toBeVisible()
  })

  test('alterna entre views', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabela' }).click()
    await expect(page).toHaveURL(/view=table/)
    await expect(page.getByRole('table')).toBeVisible()

    await page.getByRole('button', { name: 'Semana' }).click()
    await expect(page).toHaveURL(/view=week/)
  })

  test('total de horas visível', async ({ page }) => {
    await expect(page.getByText('Total:')).toBeVisible()
  })
})

test.describe.serial('Timesheet CRUD — Member', () => {
  const today = new Date().toISOString().slice(0, 10)

  test('cria apontamento com sucesso', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    // Open new entry via header button
    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })

    await page.locator('#ts-date').fill(today)
    await page.locator('#ts-start').fill('14:00')
    await page.locator('#ts-end').fill('16:00')
    await selectFirstProject(page)
    await page.locator('#ts-desc').fill('Criado pelo member E2E')
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()

    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })
  })

  test('exclui apontamento criado', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })

    const deleteBtn = page.locator('button[aria-label*="Excluir"]').first()
    if (await deleteBtn.isVisible({ timeout: 5_000 })) {
      await deleteBtn.click()
      await expect(page.getByText('Excluir apontamento?')).toBeVisible()
      await page.getByRole('button', { name: 'Excluir' }).click()
      await page.waitForTimeout(2000)
    }
  })
})
