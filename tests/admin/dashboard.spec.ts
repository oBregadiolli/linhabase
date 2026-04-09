import { test, expect } from '@playwright/test'

test.describe('Dashboard — Navegação e Views (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('exibe o nome do app "LinhaBase" na sidebar', async ({ page }) => {
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible()
  })

  test('view padrão é Mês', async ({ page }) => {
    await expect(page.getByText('Seg')).toBeVisible()
    await expect(page.getByText('Ter')).toBeVisible()
  })

  test('alterna entre views (Tabela, Mês, Semana, Dia)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabela' }).click()
    await expect(page).toHaveURL(/view=table/)
    await expect(page.getByRole('table')).toBeVisible()

    await page.getByRole('button', { name: 'Semana' }).click()
    await expect(page).toHaveURL(/view=week/)

    await page.getByRole('button', { name: 'Dia' }).click()
    await expect(page).toHaveURL(/view=day/)

    await page.getByRole('button', { name: 'Mês' }).click()
    await expect(page).toHaveURL(/view=month/)
  })

  test('navega prev/next e "Hoje"', async ({ page }) => {
    const prevBtn = page.getByLabel('Período anterior')
    const nextBtn = page.getByLabel('Próximo período')
    const todayBtn = page.getByRole('button', { name: 'Hoje' })

    await prevBtn.click()
    await page.waitForTimeout(500)
    await todayBtn.click()
    await page.waitForTimeout(500)
    await nextBtn.click()
    await page.waitForTimeout(500)
  })

  test('exibe o total de horas do período', async ({ page }) => {
    await expect(page.getByText('Total:')).toBeVisible()
  })

  test('view Tabela tem filtro e contador de registros', async ({ page }) => {
    await page.getByRole('button', { name: 'Tabela' }).click()
    await expect(page.getByPlaceholder('Filtrar por projeto...')).toBeVisible()
    await expect(page.getByText(/registro/)).toBeVisible()
  })

  test('sidebar exibe seção Administração (admin)', async ({ page }) => {
    // Admin user should see the "Administração" section in the sidebar
    await expect(page.getByText('Administração')).toBeVisible()
  })
})
