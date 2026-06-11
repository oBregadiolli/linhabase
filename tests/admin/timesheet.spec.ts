import { test, expect } from '@playwright/test'
import { openNewTimesheetDialog, waitForDashboard } from '../helpers/navigation'
import { saveTimesheetForm, selectFirstProject, clearTimesheetsOnDate } from '../helpers/timesheet'

test.describe.serial('Timesheet CRUD — Admin', () => {
  const testDate = '2099-08-10'

  test('cria apontamento com sucesso via Select de projeto', async ({ page }) => {
    test.setTimeout(60_000)
    await waitForDashboard(page)
    await openNewTimesheetDialog(page)

    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('11:30')
    await selectFirstProject(page)
    await page.locator('#ts-desc').fill('Criado pelo Playwright E2E — admin')
    await saveTimesheetForm(page)

    await page.goto(`/dashboard?view=table&date=${testDate}`)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('table tbody tr').filter({ hasText: '10/08/2099' }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('exclui ultimo apontamento criado', async ({ page }) => {
    await page.goto(`/dashboard?view=table&date=${testDate}`)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 })

    const deleteBtn = page.locator('button[aria-label*="Excluir"]').first()
    if (await deleteBtn.isVisible({ timeout: 3_000 })) {
      await deleteBtn.click()
      await expect(page.getByText('Excluir apontamento?')).toBeVisible()
      await page.getByRole('button', { name: 'Excluir' }).click()
      await expect(page.getByText('Criado pelo Playwright E2E — admin')).not.toBeVisible({ timeout: 10_000 })
    }
  })
})

test.describe('Timesheet — Validações', () => {
  test.beforeEach(async ({ page }) => {
    await waitForDashboard(page)
    await openNewTimesheetDialog(page)
  })

  test('validacao: botao desabilitado sem projeto', async ({ page }) => {
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:00')
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
  const testDate = '2099-07-20'

  test('1. cria apontamento para workflow', async ({ page }) => {
    test.setTimeout(90_000)
    await waitForDashboard(page)

    await clearTimesheetsOnDate(page, testDate)

    await openNewTimesheetDialog(page)

    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('08:00')
    await page.locator('#ts-end').fill('12:00')
    await selectFirstProject(page)
    await saveTimesheetForm(page)
  })

  test('2. admin navega para /admin/timesheets', async ({ page }) => {
    await page.goto('/admin/timesheets')
    await expect(page.locator('body')).not.toContainText('Something went wrong', { timeout: 30_000 })
  })

  test('3. cleanup — exclui apontamento', async ({ page }) => {
    await page.goto(`/dashboard?view=table&date=${testDate}`)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 })

    const deleteBtn = page.locator('button[aria-label*="Excluir"]').first()
    if (await deleteBtn.isVisible({ timeout: 3_000 })) {
      await deleteBtn.click()
      await expect(page.getByText('Excluir apontamento?')).toBeVisible()
      await page.getByRole('button', { name: 'Excluir' }).click()
      await expect(page.getByRole('table')).toBeVisible()
    }
  })
})
