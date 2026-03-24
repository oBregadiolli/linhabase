import { test, expect } from '@playwright/test'

// Nome único por run para evitar colisão
const uniqueId = Date.now()

test.describe('Formulário de Apontamento — Validações', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()
    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await expect(page.getByText('Novo Apontamento')).toBeVisible()
  })

  test('exibe título e subtítulo corretos', async ({ page }) => {
    await expect(page.getByText('Registre as horas trabalhadas')).toBeVisible()
  })

  test('validação: projeto obrigatório', async ({ page }) => {
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:00')
    await page.locator('#ts-project').fill('')

    await page.locator('button', { hasText: 'Salvar' }).click()
    await expect(page.getByText('Projeto obrigatório')).toBeVisible()
  })

  test('validação: hora fim deve ser após início', async ({ page }) => {
    await page.locator('#ts-start').fill('18:00')
    await page.locator('#ts-end').fill('09:00')
    await page.locator('#ts-project').fill('Qualquer')

    await page.locator('button', { hasText: 'Salvar' }).click()
    await expect(page.getByText('Hora fim deve ser após o início')).toBeVisible()
  })

  test('validação: data obrigatória', async ({ page }) => {
    await page.locator('#ts-date').fill('')
    await page.locator('#ts-project').fill('Teste')
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('17:00')

    await page.locator('button', { hasText: 'Salvar' }).click()
    await expect(page.getByText('Data obrigatória')).toBeVisible()
  })
})

test.describe.serial('Formulário de Apontamento — CRUD completo', () => {
  const projectName = `E2E-CRUD-${uniqueId}`
  const today = new Date().toISOString().slice(0, 10)

  test('1. cria apontamento com sucesso', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()

    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await expect(page.getByText('Novo Apontamento')).toBeVisible()

    await page.locator('#ts-date').fill(today)
    await page.locator('#ts-start').fill('10:00')
    await page.locator('#ts-end').fill('12:30')
    await page.locator('#ts-project').fill(projectName)
    await page.locator('#ts-desc').fill('Criado pelo Playwright E2E')

    await page.locator('button', { hasText: 'Salvar' }).click()

    // Drawer fecha
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })

    // Vai para Tabela e confirma que o apontamento aparece
    await page.getByText('Tabela').click()
    await page.getByPlaceholder('Filtrar por projeto...').fill(projectName)
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10_000 })

    // Verifica a duração (2h 30min = 150 min, calculado pelo trigger)
    await expect(page.getByText('2h 30min')).toBeVisible()
  })

  test('2. edita apontamento existente', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible()

    await page.getByPlaceholder('Filtrar por projeto...').fill(projectName)

    const editBtn = page.locator(`button[aria-label="Editar ${projectName}"]`).first()
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    // Verifica modo edição
    await expect(page.getByText('Editar Apontamento')).toBeVisible()
    await expect(page.getByText('Atualize os dados do apontamento')).toBeVisible()

    // O campo Status deve estar visível
    await expect(page.locator('#ts-status')).toBeVisible()

    // Fecha sem alterar
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('3. AlertDialog aparece antes de excluir (TableView)', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible()

    await page.getByPlaceholder('Filtrar por projeto...').fill(projectName)

    const deleteBtn = page.locator(`button[aria-label="Excluir ${projectName}"]`).first()
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })
    await deleteBtn.click()

    // AlertDialog aparece
    await expect(page.getByText('Excluir apontamento?')).toBeVisible()
    await expect(page.getByText('permanentemente')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Excluir' })).toBeVisible()

    // Cancela
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Excluir apontamento?')).not.toBeVisible()
  })

  test('4. exclui apontamento via AlertDialog (TableView)', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible()

    await page.getByPlaceholder('Filtrar por projeto...').fill(projectName)

    const deleteBtn = page.locator(`button[aria-label="Excluir ${projectName}"]`).first()
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })
    await deleteBtn.click()

    // Confirma exclusão
    await expect(page.getByText('Excluir apontamento?')).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()

    // Apontamento some
    await expect(page.getByText(projectName)).not.toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Formulário de Apontamento — Excluir via Drawer', () => {
  test('cria e exclui apontamento via drawer', async ({ page }) => {
    const drawerProject = `E2E-DrawerDel-${uniqueId}`
    const today = new Date().toISOString().slice(0, 10)

    // Cria
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()

    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await page.locator('#ts-date').fill(today)
    await page.locator('#ts-start').fill('14:00')
    await page.locator('#ts-end').fill('15:00')
    await page.locator('#ts-project').fill(drawerProject)
    await page.locator('button', { hasText: 'Salvar' }).click()
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })

    // Vai para Tabela e abre o drawer de edição
    await page.getByText('Tabela').click()
    await page.getByPlaceholder('Filtrar por projeto...').fill(drawerProject)
    await expect(page.getByText(drawerProject)).toBeVisible({ timeout: 10_000 })

    await page.locator(`button[aria-label="Editar ${drawerProject}"]`).first().click()
    await expect(page.getByText('Editar Apontamento')).toBeVisible()

    // Clica Excluir dentro do form
    await page.locator('button', { hasText: 'Excluir' }).first().click()
    await expect(page.getByText('Excluir apontamento?')).toBeVisible()

    // Confirma no AlertDialog
    const confirmBtn = page.locator('[role="alertdialog"] button', { hasText: 'Excluir' })
    await confirmBtn.click()

    // Drawer e apontamento somem
    await expect(page.getByText('Editar Apontamento')).not.toBeVisible({ timeout: 10_000 })
  })
})

// ─── Collision Detection ───────────────────────────────────────────────────
test.describe.serial('Formulário de Apontamento — Conflito de Horário', () => {
  const baseProject = `E2E-Base-${Date.now()}`
  // Use a fixed past date to avoid interference with real data
  const testDate = '2099-01-15'

  test('1. cria apontamento base (08:00–10:00)', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()

    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await expect(page.getByText('Novo Apontamento')).toBeVisible()

    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('08:00')
    await page.locator('#ts-end').fill('10:00')
    await page.locator('#ts-project').fill(baseProject)

    await page.locator('button', { hasText: 'Salvar' }).click()
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })
  })

  test('2. tenta criar sobreposição e vê banner de conflito', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()

    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await expect(page.getByText('Novo Apontamento')).toBeVisible()

    // Overlapping window: 09:00–11:00 intersects 08:00–10:00
    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('11:00')
    await page.locator('#ts-project').fill('Conflito-Test')

    await page.locator('button', { hasText: 'Salvar' }).click()

    // Banner appears
    await expect(page.getByText('Conflito de horário')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(baseProject)).toBeVisible()

    // Save button is disabled while conflict is active
    const saveBtn = page.locator('button', { hasText: 'Salvar' })
    await expect(saveBtn).toBeDisabled()
  })

  test('3. ajustar horário limpa o banner e habilita Salvar', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('header')).toBeVisible()

    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await expect(page.getByText('Novo Apontamento')).toBeVisible()

    // First trigger a conflict
    await page.locator('#ts-date').fill(testDate)
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('11:00')
    await page.locator('#ts-project').fill('Conflito-Test2')
    await page.locator('button', { hasText: 'Salvar' }).click()
    await expect(page.getByText('Conflito de horário')).toBeVisible({ timeout: 10_000 })

    // Fix the time → banner should disappear immediately
    await page.locator('#ts-start').fill('10:00')
    await expect(page.getByText('Conflito de horário')).not.toBeVisible()
    await expect(page.locator('button', { hasText: 'Salvar' })).not.toBeDisabled()

    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('4. limpa: exclui o apontamento base', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible()

    await page.getByPlaceholder('Filtrar por projeto...').fill(baseProject)

    const deleteBtn = page.locator(`button[aria-label="Excluir ${baseProject}"]`).first()
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })
    await deleteBtn.click()

    await expect(page.getByText('Excluir apontamento?')).toBeVisible()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText(baseProject)).not.toBeVisible({ timeout: 10_000 })
  })
})
