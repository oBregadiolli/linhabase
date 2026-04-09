import { test, expect } from '@playwright/test'

// Helper: open the project select and pick the first available option
async function selectFirstProject(page: import('@playwright/test').Page) {
  // Click the Select trigger (Base UI Select uses data-slot)
  const trigger = page.locator('[data-slot="select-trigger"]').first()
  await trigger.click()
  // Wait for popup to appear and click first item
  const item = page.locator('[data-slot="select-item"]').first()
  await expect(item).toBeVisible({ timeout: 3_000 })
  await item.click()
}

test.describe.serial('Timesheet CRUD — Admin', () => {
  const today = new Date().toISOString().slice(0, 10)

  test('cria apontamento com sucesso via Select de projeto', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    // Click + button in header
    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })

    await page.locator('#ts-date').fill(today)
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('11:30')

    // Select project via Base UI Select
    await selectFirstProject(page)

    await page.locator('#ts-desc').fill('Criado pelo Playwright E2E — admin')

    // Save
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()

    // Drawer should close
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })

    // Verify in Table view
    await page.getByRole('button', { name: 'Tabela' }).click()
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/registro/)).toBeVisible()
  })

  test('exclui ultimo apontamento criado', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })

    const deleteBtn = page.locator('button[aria-label*="Excluir"]').first()
    if (await deleteBtn.isVisible({ timeout: 3_000 })) {
      await deleteBtn.click()
      await expect(page.getByText('Excluir apontamento?')).toBeVisible()
      await page.getByRole('button', { name: 'Excluir' }).click()
      await page.waitForTimeout(2000)
    }
  })
})

test.describe('Timesheet — Validações', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })
    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })
  })

  test('validação: projeto obrigatório (Select)', async ({ page }) => {
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:00')
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()
    await expect(page.getByText('Selecione um projeto')).toBeVisible()
  })

  test('validação: hora fim deve ser após início', async ({ page }) => {
    await page.locator('#ts-start').fill('18:00')
    await page.locator('#ts-end').fill('09:00')
    await selectFirstProject(page)
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()
    await expect(page.getByText('Hora fim deve ser após o início')).toBeVisible()
  })

  test('validação: data obrigatória', async ({ page }) => {
    await page.locator('#ts-date').fill('')
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:00')
    await selectFirstProject(page)
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()
    await expect(page.getByText('Data obrigatória')).toBeVisible()
  })

  test('duração exibida corretamente', async ({ page }) => {
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:30')
    await expect(page.getByText('8h 30min')).toBeVisible()
  })

  test('duração mostra "—" quando fim ≤ início', async ({ page }) => {
    await page.locator('#ts-start').fill('18:00')
    await page.locator('#ts-end').fill('09:00')
    const durationBlock = page.locator('.tabular-nums', { hasText: '—' })
    await expect(durationBlock).toBeVisible()
  })
})

test.describe.serial('Timesheet — Submit Workflow', () => {
  const testDate = '2099-07-15'

  test('1. cria apontamento para workflow', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })

    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('08:00')
    await page.locator('#ts-end').fill('12:00')
    await selectFirstProject(page)
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })
  })

  test('2. admin navega para /admin/timesheets', async ({ page }) => {
    await page.goto('/admin/timesheets')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('3. cleanup — exclui apontamento', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })

    const deleteBtn = page.locator('button[aria-label*="Excluir"]').first()
    if (await deleteBtn.isVisible({ timeout: 3_000 })) {
      await deleteBtn.click()
      await expect(page.getByText('Excluir apontamento?')).toBeVisible()
      await page.getByRole('button', { name: 'Excluir' }).click()
      await page.waitForTimeout(2000)
    }
  })
})
