import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth', 'member.json')

setup('autenticar member E2E', async ({ page }) => {
  const email = process.env.E2E_MEMBER_EMAIL || 'e2e-member@linhabase.test'
  const password = process.env.E2E_MEMBER_PASSWORD || 'E2e@Member2026!'

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()

  // Espera o redirect para o dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

  // Salva o estado de autenticação
  await page.context().storageState({ path: authFile })
})
