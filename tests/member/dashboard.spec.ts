import { test, expect } from '@playwright/test'

// Helper: open the project select and pick the first available option
async function selectFirstProject(page: import('@playwright/test').Page) {
  const trigger = page.locator('[data-slot="select-trigger"]').first()
  await trigger.click()
  const item = page.locator('[data-slot="select-item"]').first()
  await expect(item).toBeVisible({ timeout: 3_000 })
  await item.click()
}

async function selectProjectByIndex(page: import('@playwright/test').Page, index: number): Promise<string> {
  const trigger = page.locator('[data-slot="select-trigger"]').first()
  await trigger.click()
  const items = page.locator('[data-slot="select-item"]')
  const item = items.nth(index)
  await expect(item).toBeVisible({ timeout: 3_000 })
  const name = (await item.innerText()).trim()
  await item.click()
  return name
}

function ddmm(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}`
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
  const testDate = '2099-07-15'

  test('cria apontamento com sucesso', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    // Open new entry via header button
    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })

    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('14:00')
    await page.locator('#ts-end').fill('16:00')
    await selectFirstProject(page)
    await page.locator('#ts-desc').fill('Criado pelo member E2E')
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()

    // Se já existir um apontamento no mesmo período (base suja), substituir.
    {
      const dialog = page.getByRole('dialog', { name: 'Novo Apontamento' })
      try {
        await expect(dialog.getByText('Conflito de horário')).toBeVisible({ timeout: 3_000 })
        await dialog.getByRole('button', { name: 'Substituir' }).click()
        const confirm = page.getByRole('button', { name: 'Excluir e substituir' })
        await expect(confirm).toBeVisible({ timeout: 3_000 })
        await confirm.click()
      } catch {
        // no conflict -> nothing to do
      }
    }

    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })
  })

  test('exclui apontamento criado', async ({ page }) => {
    await page.goto(`/dashboard?view=table&date=${testDate}`)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 })

    const [y, m, d] = testDate.split('-')
    const dateLabel = `${d}/${m}/${y}`
    const row = page.locator('table tbody tr').filter({ hasText: dateLabel }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await row.locator('button[aria-label^="Excluir"]').click()
    await expect(page.getByText('Excluir apontamento?')).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await page.waitForTimeout(2000)
  })
})

test.describe.serial('QuickEntry (XY) — bloqueio de sobreposição', () => {
  test('detecta conflito e permite substituir', async ({ page }) => {
    const targetIso = '2099-07-16'
    const targetDate = new Date(`${targetIso}T12:00:00`)
    const targetLabel = ddmm(targetDate)

    // 1) Criar um apontamento 08:00–10:00 em um projeto (Projeto A)
    await page.goto(`/dashboard?date=${targetIso}`)
    await expect(page.getByText('LinhaBase', { exact: true })).toBeVisible({ timeout: 15_000 })

    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })

    await page.locator('#ts-date').fill(targetIso)
    await page.locator('#ts-start').fill('08:00')
    await page.locator('#ts-end').fill('10:00')
    const projectA = await selectProjectByIndex(page, 0)
    await page.locator('button').filter({ hasText: 'Salvar' }).first().click()

    // Se houver conflito por dados antigos, substituir.
    {
      const dialog = page.getByRole('dialog', { name: 'Novo Apontamento' })
      try {
        await expect(dialog.getByText('Conflito de horário')).toBeVisible({ timeout: 3_000 })
        await dialog.getByRole('button', { name: 'Substituir' }).click()
        const confirm = page.getByRole('button', { name: 'Excluir e substituir' })
        await expect(confirm).toBeVisible({ timeout: 3_000 })
        await confirm.click()
      } catch {
        // no conflict -> nothing to do
      }
    }
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })

    // Capturar nome do Projeto B (sem estar na view XY, pois o botão + não aparece lá)
    await page.locator('header button').last().click()
    await expect(page.getByRole('heading', { name: 'Novo Apontamento' })).toBeVisible({ timeout: 5_000 })
    const projectB = await selectProjectByIndex(page, 1)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    expect(projectB).not.toBe(projectA)

    // 2) Ir para a view XY e tentar lançar 2h (08:00–10:00) em outro projeto (Projeto B) no mesmo dia
    await page.getByRole('button', { name: 'XY' }).click()
    await expect(page).toHaveURL(/view=xy/)

    // Encontrar o índice da coluna do dia (dd/mm)
    const headers = page.locator('table thead th')
    const headerCount = await headers.count()
    let dayCol = -1
    for (let i = 0; i < headerCount; i++) {
      const txt = (await headers.nth(i).innerText()).replace(/\s+/g, ' ')
      if (txt.includes(targetLabel)) { dayCol = i; break }
    }
    expect(dayCol).toBeGreaterThan(0)

    // Encontrar a linha do Projeto B e abrir a célula do dia
    const rowB = page.locator('table tbody tr').filter({ hasText: projectB }).first()
    await expect(rowB).toBeVisible({ timeout: 10_000 })
    const cell = rowB.locator('td').nth(dayCol)
    await cell.locator('button[title="Clique para apontar"]').click()

    // Preencher 2 horas e salvar (Enter) — deve acusar conflito
    const input = cell.locator('input[placeholder="h"]')
    await expect(input).toBeVisible({ timeout: 5_000 })
    await input.fill('2')
    await input.press('Enter')
    await expect(cell.getByText('Conflito de horário')).toBeVisible({ timeout: 5_000 })

    // Substituir (deletar o conflitante e salvar o novo)
    await cell.getByRole('button', { name: 'Substituir' }).click()

    // Célula deve sair do modo edição e mostrar 2,00
    await expect(cell.getByText('2,00')).toBeVisible({ timeout: 10_000 })
  })
})
