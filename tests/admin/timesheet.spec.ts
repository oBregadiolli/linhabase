import { test, expect } from '@playwright/test'

// Helper: open the project combobox and pick the first available option
async function selectFirstProject(page: import('@playwright/test').Page) {
  const trigger = page.locator('[role="combobox"]').first()
  await trigger.click()
  // Wait for the listbox to be visible
  const listbox = page.locator('[role="listbox"]')
  await expect(listbox).toBeVisible({ timeout: 5_000 })
  // Click the first option (auto-closes dropdown)
  const item = listbox.locator('[role="option"]').first()
  await expect(item).toBeVisible({ timeout: 3_000 })
  await item.click()
  // Move focus away from combobox to ensure dropdown is closed
  await page.locator('#ts-desc').click()
  await page.waitForTimeout(300)
}

test.describe.serial('Timesheet CRUD — Admin', () => {
  const today = new Date().toISOString().slice(0, 10)

  // FIXME: Supabase checkOverlap() query hangs due to network latency in local environment
  test.fixme('cria apontamento com sucesso via Select de projeto', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    // Click + button in header
    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })

    await page.locator('#ts-date').fill(today)
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('11:30')

    // Select project via Combobox
    await selectFirstProject(page)

    await page.locator('#ts-desc').fill('Criado pelo Playwright E2E — admin')
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()

    // Handle possible overlap conflict
    const conflictText = page.getByText('Conflito de horário')
    const hasConflict = await conflictText.isVisible({ timeout: 5_000 }).catch(() => false)
    if (hasConflict) {
      await page.getByRole('button', { name: 'Substituir' }).click()
      await page.waitForTimeout(1000)
      // Look for confirmation button if it appears
      const confirmBtn = page.getByRole('button', { name: /Excluir|substituir/i })
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click()
      }
    }

    // Dialog should close (form submitted)
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 30_000 })

    // Verify in Table view
    await page.getByRole('button', { name: 'Tabela' }).click()
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/registro/)).toBeVisible()
  })

  test('exclui ultimo apontamento criado', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 })

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

  test('validacao: botao desabilitado sem projeto', async ({ page }) => {
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:00')
    // Submit button should be disabled when no project is selected
    const submitBtn = page.locator('button').filter({ hasText: 'Salvar e Enviar' })
    await expect(submitBtn).toBeDisabled()
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

  // FIXME: Supabase checkOverlap() query hangs due to network latency in local environment
  test.fixme('1. cria apontamento para workflow', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })

    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('08:00')
    await page.locator('#ts-end').fill('12:00')
    await selectFirstProject(page)
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()

    // Handle possible overlap conflict from previous test run
    const conflictText = page.getByText('Conflito de horário')
    const hasConflict = await conflictText.isVisible({ timeout: 15_000 }).catch(() => false)
    if (hasConflict) {
      await page.getByRole('button', { name: 'Substituir' }).click()
      await page.waitForTimeout(1000)
      const confirmBtn = page.getByRole('button', { name: /Excluir|substituir/i })
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click()
      }
    }

    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 30_000 })
  })

  test('2. admin navega para /admin/timesheets', async ({ page }) => {
    await page.goto('/admin/timesheets')
    await page.waitForTimeout(5000)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('3. cleanup — exclui apontamento', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 })

    const deleteBtn = page.locator('button[aria-label*="Excluir"]').first()
    if (await deleteBtn.isVisible({ timeout: 3_000 })) {
      await deleteBtn.click()
      await expect(page.getByText('Excluir apontamento?')).toBeVisible()
      await page.getByRole('button', { name: 'Excluir' }).click()
      await page.waitForTimeout(2000)
    }
  })
})
