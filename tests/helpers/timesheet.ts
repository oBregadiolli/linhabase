import { expect, type Page } from '@playwright/test'
import { waitForTimesheetDialogClosed } from './navigation'

const projectCombobox = (page: Page) => page.locator('[role="combobox"]').first()
const projectListbox = (page: Page) => page.locator('#project-combobox-listbox')
const timesheetDialog = (page: Page) => page.getByRole('dialog', { name: 'Novo Apontamento' })

async function closeProjectListbox(page: Page) {
  const combobox = projectCombobox(page)
  if (!(await combobox.isVisible().catch(() => false))) return

  if ((await combobox.getAttribute('aria-expanded')) === 'true') {
    await combobox.click()
  }

  await expect(combobox).toHaveAttribute('aria-expanded', 'false', { timeout: 5_000 })
}

async function waitForProjectListboxClosed(page: Page) {
  await closeProjectListbox(page)
}

export async function selectFirstProject(page: Page) {
  const trigger = projectCombobox(page)
  await trigger.click()
  const listbox = projectListbox(page)
  await expect(listbox).toBeVisible({ timeout: 5_000 })
  const item = listbox.locator('[role="option"]').first()
  await item.click()
  await waitForProjectListboxClosed(page)
}

export async function selectProjectByIndex(page: Page, index: number): Promise<string> {
  const trigger = projectCombobox(page)
  await trigger.click()
  const listbox = projectListbox(page)
  await expect(listbox).toBeVisible({ timeout: 5_000 })
  const item = listbox.locator('[role="option"]').nth(index)
  await expect(item).toBeVisible({ timeout: 3_000 })
  const fullText = (await item.innerText()).trim()
  const name = fullText.split('\n')[0].trim()
  await item.click()
  await waitForProjectListboxClosed(page)
  return name
}

export async function resolveOverlapInDialog(page: Page) {
  const dialog = timesheetDialog(page)
  const conflict = dialog.getByText('Conflito de horário')

  if (!(await conflict.isVisible().catch(() => false))) return

  await dialog.getByRole('heading', { name: 'Novo Apontamento' }).click()
  await closeProjectListbox(page)

  await dialog.getByRole('button', { name: 'Substituir' }).click()

  await expect(page.getByText('Substituir apontamento existente?')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Excluir e substituir' }).click()
  await expect(page.getByText('Substituir apontamento existente?')).not.toBeVisible({ timeout: 15_000 })

  await expect
    .poll(async () => {
      if (!(await dialog.isVisible().catch(() => false))) return 'closed'
      if (!(await conflict.isVisible().catch(() => false))) return 'resolved'
      return 'waiting'
    }, { timeout: 30_000 })
    .not.toBe('waiting')
}

export async function saveTimesheetForm(page: Page) {
  const dialog = timesheetDialog(page)
  const submitBtn = page.getByRole('button', { name: 'Salvar e Enviar' })

  await expect
    .poll(async () => {
      if (!(await dialog.isVisible().catch(() => false))) return 'closed'
      if (await submitBtn.isEnabled()) return 'ready'
      if (await dialog.getByText('Conflito de horário').isVisible()) return 'conflict'
      return 'waiting'
    }, { timeout: 20_000 })
    .not.toBe('waiting')

  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await dialog.isVisible().catch(() => false))) break

    if (await dialog.getByText('Conflito de horário').isVisible().catch(() => false)) {
      await resolveOverlapInDialog(page)
      continue
    }

    if (!(await dialog.isVisible().catch(() => false))) break

    const canSubmit = await submitBtn.isVisible().catch(() => false)
    if (canSubmit && (await submitBtn.isEnabled())) {
      await closeProjectListbox(page)
      await submitBtn.click()
    }

    if (!(await dialog.isVisible().catch(() => false))) break
  }

  await waitForTimesheetDialogClosed(page)
}

export async function clearTimesheetsOnDate(page: Page, isoDate: string) {
  await page.goto(`/dashboard?view=table&date=${isoDate}`)
  await expect(page.locator('table')).toBeVisible({ timeout: 15_000 })

  const [y, m, d] = isoDate.split('-')
  const dateLabel = `${d}/${m}/${y}`

  for (let i = 0; i < 10; i++) {
    const row = page.locator('table tbody tr').filter({ hasText: dateLabel }).first()
    if (!(await row.isVisible().catch(() => false))) break
    await row.locator('button[aria-label^="Excluir"]').click()
    await expect(page.getByText('Excluir apontamento?')).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText('Excluir apontamento?')).not.toBeVisible({ timeout: 10_000 })
  }
}
