import { test, expect } from '@playwright/test'

test.describe('Dashboard — Navegação e Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()
  })

  test('exibe o nome do app "LinhaBase" no header', async ({ page }) => {
    await expect(page.locator('header')).toContainText('LinhaBase')
  })

  test('view padrão é Mês', async ({ page }) => {
    await expect(page.getByText('Seg')).toBeVisible()
    await expect(page.getByText('Ter')).toBeVisible()
  })

  test('alterna entre views (Table, Month, Week, Day)', async ({ page }) => {
    // Vai para Tabela
    await page.getByText('Tabela').click()
    await expect(page).toHaveURL(/view=table/)
    await expect(page.getByRole('table')).toBeVisible()

    // Vai para Semana
    await page.getByText('Semana').click()
    await expect(page).toHaveURL(/view=week/)

    // Vai para Dia
    await page.getByText('Dia').click()
    await expect(page).toHaveURL(/view=day/)

    // Volta para Mês
    await page.getByText('Mês').click()
    await expect(page).toHaveURL(/view=month/)
  })

  test('navega prev/next e "Hoje"', async ({ page }) => {
    // Usa aria-label dos botões do PeriodNavigator
    const prevBtn  = page.getByLabel('Período anterior')
    const nextBtn  = page.getByLabel('Próximo período')
    const todayBtn = page.getByText('Hoje')

    // Captura a URL inicial
    const initialUrl = page.url()

    // Clica "anterior" → URL muda com ?date=
    await prevBtn.click()
    await expect(page).not.toHaveURL(initialUrl)

    // Clica "Hoje" para voltar
    await todayBtn.click()

    // Clica "próximo"
    await nextBtn.click()
    await expect(page).not.toHaveURL(initialUrl)
  })

  test('exibe o total de horas do período', async ({ page }) => {
    await expect(page.getByText('Total:')).toBeVisible()
  })

  test('view Tabela tem filtro e contador de registros', async ({ page }) => {
    await page.getByText('Tabela').click()
    await expect(page.getByPlaceholder('Filtrar por projeto...')).toBeVisible()
    await expect(page.getByText(/registro/)).toBeVisible()
  })
})

test.describe('Dashboard — Duração calculada na UI', () => {
  test('duração exibida corretamente ao criar apontamento', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()

    await page.locator('button', { hasText: 'Novo Apontamento' }).click()

    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:30')

    await expect(page.getByText('8h 30min')).toBeVisible()
  })

  test('duração mostra "—" quando fim ≤ início', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()

    await page.locator('button', { hasText: 'Novo Apontamento' }).click()

    await page.locator('#ts-start').fill('18:00')
    await page.locator('#ts-end').fill('09:00')

    // O span com "—" dentro do bloco de duração
    const durationBlock = page.locator('.tabular-nums', { hasText: '—' })
    await expect(durationBlock).toBeVisible()
  })
})
