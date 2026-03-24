import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth', 'user.json')

setup('autenticar usuário de teste', async ({ page }) => {
  // Credenciais de teste (hardcoded por enquanto — produção usaria env vars)
  const email = 'bregadiolli.contato@gmail.com'
  const password = 'ToprakTurco9292@'

  await page.goto('/login')

  // Preenche o formulário de login
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('button[type="submit"]').click()

  // Espera o redirect para o dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })

  // Salva o estado de autenticação para reutilizar nos outros testes
  await page.context().storageState({ path: authFile })
})
