import { test, expect, Page } from '@playwright/test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid       = Date.now()
const TEST_DATE = '2099-06-10' // far-future → zero chance of real-data collision

async function goTo(page: Page, view: 'day' | 'week' | 'month') {
  await page.goto(`/dashboard?view=${view}&date=${TEST_DATE}`)
  await expect(page.locator('header')).toBeVisible()
}

/** Returns the first clickable timeline column */
async function getTimelineColumn(page: Page) {
  const col = page.locator('.cursor-crosshair').first()
  await expect(col).toBeVisible({ timeout: 5_000 })
  return col
}

/** Click the timeline at a given hour offset */
async function clickAtHour(page: Page, hour: number) {
  const col  = await getTimelineColumn(page)
  const box  = await col.boundingBox()
  if (!box) throw new Error('Timeline column not found')
  const SLOT_PX = 64
  const START_H = 6
  const y = box.y + (hour - START_H) * SLOT_PX + SLOT_PX / 2
  await page.mouse.click(box.x + box.width / 2, y)
}

/** Wait for the QuickCreatePopover to be visible — uses text that is always present */
async function expectPopoverOpen(page: Page) {
  await expect(page.getByText('Novo Apontamento').first()).toBeVisible({ timeout: 6_000 })
}

/** Returns the currently open quick-create popover container (the fixed div rendered in portal) */
function getPopover(page: Page) {
  // The popover header contains a unique grab icon + "Novo Apontamento" text
  // We scope to the fixed portal element by finding the GripVertical svg's parent chain
  return page.locator('[role="dialog"][aria-label]').filter({ hasText: 'Novo ApontamentoMais opções' })
}

// ═══════════════════════════════════════════════════════════════════════════
// Suite 1 — WarningHourConflict reutilizável
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('WarningHourConflict — componente reutilizável', () => {
  const baseProject = `WarnBase-${uid}`

  test('1. cria apontamento base para gerar conflito', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await expect(page.getByText('Registre as horas trabalhadas')).toBeVisible()
    await page.locator('#ts-date').fill(TEST_DATE)
    await page.locator('#ts-start').fill('09:00')
    await page.locator('#ts-end').fill('18:00')
    await page.locator('#ts-project').fill(baseProject)
    await page.locator('button', { hasText: 'Salvar' }).click()
    await expect(page.getByText('Registre as horas trabalhadas')).not.toBeVisible({ timeout: 10_000 })
  })

  test('2. banner aparece no drawer (variante full) com botão Substituir', async ({ page }) => {
    await page.goto('/dashboard')
    await page.locator('button', { hasText: 'Novo Apontamento' }).click()
    await page.locator('#ts-date').fill(TEST_DATE)
    await page.locator('#ts-start').fill('10:00')
    await page.locator('#ts-end').fill('12:00')
    await page.locator('#ts-project').fill('Overlap-Drawer')
    await page.locator('button', { hasText: 'Salvar' }).click()

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Conflito de horário')).toBeVisible()
    await expect(page.getByText(baseProject)).toBeVisible()
    // Variante full tem botão "Substituir"
    await expect(page.getByRole('button', { name: /substituir/i })).toBeVisible()
    // Salvar desabilitado
    await expect(page.locator('button', { hasText: 'Salvar' })).toBeDisabled()
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('3. banner compact aparece no popover (sem botão Substituir)', async ({ page }) => {
    await goTo(page, 'day')
    await clickAtHour(page, 10)
    await expectPopoverOpen(page)

    const popover = getPopover(page)
    await popover.locator('input[type="time"]').first().fill('10:00')
    await popover.locator('input[type="time"]').last().fill('12:00')
    await popover.locator('input[placeholder="Nome do projeto"]').fill('Overlap-Popover')
    await popover.locator('button', { hasText: 'Salvar' }).click()

    // Banner de conflito compacto (sem botão Substituir)
    await expect(popover.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(popover.getByText('Conflito de horário')).toBeVisible()
    // Compact não tem Substituir
    await expect(popover.getByRole('button', { name: /substituir/i })).not.toBeVisible()
    // Salvar desabilitado
    await expect(popover.locator('button', { hasText: 'Salvar' })).toBeDisabled()
  })

  test('4. limpa: exclui o apontamento base', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await expect(page.getByRole('table')).toBeVisible()
    await page.getByPlaceholder('Filtrar por projeto...').fill(baseProject)
    const del = page.locator(`button[aria-label="Excluir ${baseProject}"]`).first()
    await expect(del).toBeVisible({ timeout: 8_000 })
    await del.click()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText(baseProject)).not.toBeVisible({ timeout: 8_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Suite 2 — QuickCreatePopover Day View
// ═══════════════════════════════════════════════════════════════════════════
test.describe.serial('QuickCreatePopover — Day View', () => {
  const proj = `QCP-Day-${uid}`

  test('abre ao clicar na timeline com horário pré-preenchido', async ({ page }) => {
    await goTo(page, 'day')
    await clickAtHour(page, 8)
    await expectPopoverOpen(page)

    const popover = getPopover(page)
    const startVal = await popover.locator('input[type="time"]').first().inputValue()
    expect(startVal).toMatch(/^0[78]:/)
    await page.keyboard.press('Escape')
  })

  test('fecha com Escape', async ({ page }) => {
    await goTo(page, 'day')
    await clickAtHour(page, 9)
    await expectPopoverOpen(page)
    await page.keyboard.press('Escape')
    await expect(getPopover(page)).not.toBeVisible({ timeout: 3_000 })
  })

  test('fecha ao clicar fora', async ({ page }) => {
    await goTo(page, 'day')
    await clickAtHour(page, 9)
    await expectPopoverOpen(page)
    await page.mouse.click(5, 5)
    await expect(getPopover(page)).not.toBeVisible({ timeout: 3_000 })
  })

  test('valida: projeto obrigatório', async ({ page }) => {
    await goTo(page, 'day')
    await clickAtHour(page, 9)
    await expectPopoverOpen(page)
    const popover = getPopover(page)
    await popover.locator('button', { hasText: 'Salvar' }).click()
    await expect(popover.getByText('Projeto obrigatório')).toBeVisible()
  })

  test('salva via popover e aparece no calendário', async ({ page }) => {
    await goTo(page, 'day')
    await clickAtHour(page, 7)
    await expectPopoverOpen(page)

    const popover = getPopover(page)
    await popover.locator('input[placeholder="Nome do projeto"]').fill(proj)
    await popover.locator('input[type="time"]').first().fill('07:00')
    await popover.locator('input[type="time"]').last().fill('08:00')
    await popover.locator('textarea').fill('Criado via popover E2E')
    await popover.locator('button', { hasText: 'Salvar' }).click()

    await expect(getPopover(page)).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(proj)).toBeVisible({ timeout: 10_000 })
  })

  test('"Mais opções" abre drawer completo', async ({ page }) => {
    await goTo(page, 'day')
    await clickAtHour(page, 9)
    await expectPopoverOpen(page)
    await getPopover(page).locator('button', { hasText: 'Mais opções' }).click()
    await expect(getPopover(page)).not.toBeVisible()
    await expect(page.getByText('Registre as horas trabalhadas')).toBeVisible({ timeout: 5_000 })
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('limpa: exclui o apontamento criado via popover', async ({ page }) => {
    await page.goto('/dashboard?view=table')
    await page.getByPlaceholder('Filtrar por projeto...').fill(proj)
    const del = page.locator(`button[aria-label="Excluir ${proj}"]`).first()
    await expect(del).toBeVisible({ timeout: 10_000 })
    await del.click()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText(proj)).not.toBeVisible({ timeout: 8_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Suite 3 — QuickCreatePopover Week View
// ═══════════════════════════════════════════════════════════════════════════
test.describe('QuickCreatePopover — Week View', () => {
  test('abre popover ao clicar numa coluna de dia', async ({ page }) => {
    await goTo(page, 'week')
    const col = page.locator('.cursor-crosshair').first()
    await expect(col).toBeVisible({ timeout: 5_000 })
    const box = await col.boundingBox()
    if (!box) throw new Error('no week column')
    await page.mouse.click(box.x + box.width / 2, box.y + (9 - 6) * 64 + 32)
    await expectPopoverOpen(page)
    await page.keyboard.press('Escape')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Suite 4 — QuickCreatePopover Month View
// ═══════════════════════════════════════════════════════════════════════════
test.describe('QuickCreatePopover — Month View', () => {
  test('abre popover ao clicar numa célula do mês', async ({ page }) => {
    await goTo(page, 'month')
    // Month cells with hover class (current-month days)
    const cell = page.locator('.cursor-pointer').first()
    await expect(cell).toBeVisible({ timeout: 5_000 })
    await cell.click()
    await expectPopoverOpen(page)
    await page.keyboard.press('Escape')
  })

  test('botão "+" abre drawer, não o popover', async ({ page }) => {
    await goTo(page, 'month')
    const plus = page.locator('button[title="Novo apontamento"]').first()
    await expect(plus).toBeVisible({ timeout: 5_000 })
    await plus.click()
    await expect(page.getByText('Registre as horas trabalhadas')).toBeVisible({ timeout: 5_000 })
    // Quick popover NOT open at the same time
    await expect(getPopover(page)).not.toBeVisible()
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Suite 5 — Drag & Resize
// ═══════════════════════════════════════════════════════════════════════════
test.describe('QuickCreatePopover — Drag & Resize', () => {
  async function openPopover(page: Page) {
    await goTo(page, 'day')
    await clickAtHour(page, 10)
    await expectPopoverOpen(page)
    return getPopover(page)
  }

  test('drag move: posição muda ao arrastar pelo header', async ({ page }) => {
    const popover = await openPopover(page)
    const before  = await popover.boundingBox()
    if (!before) throw new Error('no bounding box')

    const header = popover.locator('.cursor-grab')
    const hBox   = await header.boundingBox()
    if (!hBox) throw new Error('no header')

    const cx = hBox.x + hBox.width / 2
    const cy = hBox.y + hBox.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 150, cy + 60, { steps: 15 })
    await page.mouse.up()

    const after = await popover.boundingBox()
    if (!after) throw new Error('no bounding box after drag')
    expect(Math.abs(after.x - before.x)).toBeGreaterThan(100)
    expect(Math.abs(after.y - before.y)).toBeGreaterThan(40)
  })

  test('resize: dimensões aumentam ao arrastar o handle', async ({ page }) => {
    const popover = await openPopover(page)
    const before  = await popover.boundingBox()
    if (!before) throw new Error('no bounding box')

    const handle = popover.locator('div[title="Redimensionar"]')
    const hBox   = await handle.boundingBox()
    if (!hBox) throw new Error('no resize handle')

    const cx = hBox.x + hBox.width / 2
    const cy = hBox.y + hBox.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 100, cy + 80, { steps: 15 })
    await page.mouse.up()

    const after = await popover.boundingBox()
    if (!after) throw new Error('no bounding box after resize')
    expect(after.width ).toBeGreaterThan(before.width  + 50)
    expect(after.height).toBeGreaterThan(before.height + 40)
  })

  test('clicar no X fecha sem arrastar', async ({ page }) => {
    const popover = await openPopover(page)
    const before  = await popover.boundingBox()
    if (!before) throw new Error('no bounding box')
    await popover.locator('button[aria-label="Fechar"]').click()
    await expect(popover).not.toBeVisible({ timeout: 3_000 })
  })
})
