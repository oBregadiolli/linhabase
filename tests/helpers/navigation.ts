import { expect, type Page } from '@playwright/test'

export async function gotoAdminTab(page: Page, tab: string) {
  await page.goto(`/admin?tab=${tab}`)
  await expect(page.locator('body')).not.toContainText('Something went wrong', { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

export async function waitForDashboard(page: Page, path = '/dashboard') {
  await page.goto(path)
  await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })
}

export async function openNewTimesheetDialog(page: Page) {
  await page.locator('header button').last().click()
  await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })
}

export async function waitForTimesheetDialogClosed(page: Page) {
  await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).not.toBeVisible({ timeout: 30_000 })
}
