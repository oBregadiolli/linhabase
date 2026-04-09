import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('exibe página de login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Boas-Vindas de volta!')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('exibe erro de credencial inválida', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('invalid@test.com')
    await page.locator('#password').fill('WrongPassword123!')
    await page.locator('button[type="submit"]').click()
    await expect(page.getByText(/inválidos|credenciais/i)).toBeVisible({ timeout: 10_000 })
  })

  test('login válido redireciona para dashboard', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@linhabase.test'
    const password = process.env.E2E_ADMIN_PASSWORD || 'E2e@Admin2026!'

    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
  })

  test('link "Crie sua conta" navega para /register', async ({ page }) => {
    await page.goto('/login')
    await page.getByText('Crie sua conta').click()
    await expect(page).toHaveURL(/register/)
  })
})

test.describe('Register Page', () => {
  test('exibe formulário de cadastro', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toBeVisible()
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('link "Acesse aqui" navega para /login', async ({ page }) => {
    await page.goto('/register')
    await page.getByText('Acesse aqui').click()
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('Route Protection', () => {
  test('/ redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/, { timeout: 15_000 })
  })

  test('/dashboard redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 15_000 })
  })

  test('/admin redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/login/, { timeout: 15_000 })
  })
})

test.describe('Invite Page (público)', () => {
  test('exibe mensagem sem token', async ({ page }) => {
    await page.goto('/invite')
    // Without token, redirect to login or show "Link incompleto"
    await page.waitForTimeout(3000)
    const hasIncomplete = await page.getByText('Link incompleto').isVisible().catch(() => false)
    const isOnLogin = page.url().includes('/login')
    expect(hasIncomplete || isOnLogin).toBe(true)
  })

  test('exibe mensagem com token inválido', async ({ page }) => {
    await page.goto('/invite?token=invalid-token-12345')
    await page.waitForTimeout(3000)
    const hasNotFound = await page.getByRole('heading', { name: 'Convite não encontrado' }).isVisible().catch(() => false)
    const isOnLogin = page.url().includes('/login')
    expect(hasNotFound || isOnLogin).toBe(true)
  })
})
