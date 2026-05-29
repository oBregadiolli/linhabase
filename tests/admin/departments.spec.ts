import { test, expect } from '@playwright/test'

test.describe('Admin — Departamentos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin?tab=departments')
    await page.waitForTimeout(5000)
  })

  test('carrega a tab de departamentos sem erros', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('exibe departamento do seed', async ({ page }) => {
    await expect(page.getByText('E2E Engenharia')).toBeVisible({ timeout: 10_000 })
  })

  test('exibe estatisticas de departamentos', async ({ page }) => {
    // Stats cards: DOM text is capitalized, displayed uppercase via CSS
    const deptCard = page.locator('p', { hasText: 'Departamentos' }).first()
    await expect(deptCard).toBeVisible()
  })

  test('expande departamento e mostra equipe', async ({ page }) => {
    // Click the expand arrow on the department row
    const deptRow = page.locator('text=E2E Engenharia').first()
    await deptRow.click()
    await page.waitForTimeout(1000)

    await expect(page.getByText('E2E Backend')).toBeVisible({ timeout: 5_000 })
  })

  test('abre modal de novo departamento', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Novo Departamento' })
    await expect(btn).toBeVisible({ timeout: 5_000 })
    await btn.click()
    await page.waitForTimeout(1000)
    const hasInput = await page.locator('input[type="text"]').first().isVisible().catch(() => false)
    expect(hasInput).toBe(true)
  })
})

test.describe.serial('Admin — CRUD de Departamentos', () => {
  const deptName = `E2E Dept Auto ${Date.now()}`

  test('cria novo departamento', async ({ page }) => {
    await page.goto('/admin?tab=departments')
    await page.waitForTimeout(5000)

    const btn = page.getByRole('button', { name: 'Novo Departamento' })
    await btn.click()
    await page.waitForTimeout(1000)

    // Fill department name
    const nameField = page.getByPlaceholder('Engenharia de Software')
    await expect(nameField).toBeVisible({ timeout: 3_000 })
    await nameField.fill(deptName)

    // Click create button
    await page.getByRole('button', { name: 'Criar Departamento' }).click()
    await page.waitForTimeout(3000)

    await expect(page.getByText(deptName)).toBeVisible({ timeout: 10_000 })
  })
})
