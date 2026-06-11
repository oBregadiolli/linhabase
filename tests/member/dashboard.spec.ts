import { test, expect } from '@playwright/test'
import { openNewTimesheetDialog, waitForDashboard } from '../helpers/navigation'
import { saveTimesheetForm, selectFirstProject, selectProjectByIndex, clearTimesheetsOnDate } from '../helpers/timesheet'

test.describe.configure({ mode: 'serial' })

function ddmm(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}`
}

test.describe('Dashboard — Member', () => {
  test.beforeEach(async ({ page }) => {
    await waitForDashboard(page)
  })

  test('exibe dashboard para membro', async ({ page }) => {
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible()
    await expect(page.getByText('Total:')).toBeVisible()
  })

  test('alterna entre views', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabela' }).click()
    await expect(page).toHaveURL(/view=table/)
    await expect(page.locator('table')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Semana' }).click()
    await expect(page).toHaveURL(/view=week/)
  })

  test('total de horas visível', async ({ page }) => {
    await expect(page.getByText('Total:')).toBeVisible()
  })
})

test.describe.serial('Timesheet CRUD — Member', () => {
  const testDate = '2099-07-15'

  test('cria apontamento com sucesso', async ({ page }) => {
    test.setTimeout(60_000)
    await waitForDashboard(page)
    await openNewTimesheetDialog(page)

    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('14:00')
    await page.locator('#ts-end').fill('16:00')
    await selectFirstProject(page)
    await page.locator('#ts-desc').fill('Criado pelo member E2E')
    await saveTimesheetForm(page)
  })

  test('exclui apontamento criado', async ({ page }) => {
    await page.goto(`/dashboard?view=table&date=${testDate}`)
    await expect(page.locator('table')).toBeVisible({ timeout: 15_000 })

    const [y, m, d] = testDate.split('-')
    const dateLabel = `${d}/${m}/${y}`
    const row = page.locator('table tbody tr').filter({ hasText: dateLabel }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.locator('button[aria-label^="Excluir"]').click()
    await expect(page.getByText('Excluir apontamento?')).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(row).not.toBeVisible({ timeout: 10_000 })
  })
})

test.describe.serial('QuickEntry (XY) — apontamentos no mesmo dia', () => {
  test('empilha horas após o último apontamento do dia', async ({ page }) => {
    test.setTimeout(60_000)
    const targetIso = '2099-07-29'
    const targetDate = new Date(`${targetIso}T12:00:00`)
    const targetLabel = ddmm(targetDate)

    await page.goto(`/dashboard?date=${targetIso}`)
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    await clearTimesheetsOnDate(page, targetIso)

    // Apontamento base 08:00–10:00 (projeto A)
    await openNewTimesheetDialog(page)
    await page.locator('#ts-date').fill(targetIso)
    await page.locator('#ts-start').fill('08:00')
    await page.locator('#ts-end').fill('10:00')
    const projectA = await selectProjectByIndex(page, 0)
    await saveTimesheetForm(page)

    await openNewTimesheetDialog(page)
    const projectB = await selectProjectByIndex(page, 1)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    expect(projectB).not.toBe(projectA)

    await page.getByRole('button', { name: 'XY' }).click()
    await expect(page).toHaveURL(/view=xy/)

    const headers = page.locator('table thead th')
    const headerCount = await headers.count()
    let dayCol = -1
    for (let i = 0; i < headerCount; i++) {
      const txt = (await headers.nth(i).innerText()).replace(/\s+/g, ' ')
      if (txt.includes(targetLabel)) { dayCol = i; break }
    }
    expect(dayCol).toBeGreaterThan(0)

    const rowB = page.locator('table tbody tr').filter({ hasText: projectB }).first()
    await expect(rowB).toBeVisible({ timeout: 10_000 })
    const cellB = rowB.locator('td').nth(dayCol)

    // XY empilha após 10:00 — sem conflito com o apontamento de projectA
    await cellB.locator('button[title="Clique para apontar"]').click()
    const input = cellB.locator('input[placeholder="h"]')
    await expect(input).toBeVisible({ timeout: 5_000 })
    await input.fill('2')
    await input.press('Enter')
    await expect(cellB.getByText('2,00')).toBeVisible({ timeout: 15_000 })
    await expect(cellB.getByText('Conflito de horário')).not.toBeVisible()

    const rowA = page.locator('table tbody tr').filter({ hasText: projectA }).first()
    await expect(rowA.locator('td').nth(dayCol).getByText('2,00')).toBeVisible({ timeout: 10_000 })
  })
})
