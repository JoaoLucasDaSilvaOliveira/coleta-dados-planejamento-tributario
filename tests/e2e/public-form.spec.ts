import { expect, test } from '@playwright/test'
test('shows a neutral state when no public token is present', async ({ page }) => { await page.goto('/f'); await expect(page.getByText('Link indisponível')).toBeVisible() })
test('login exposes accessible credential fields', async ({ page }) => { await page.goto('/login'); await expect(page.getByLabel('Nome de usuário')).toBeVisible(); await expect(page.getByLabel('Senha')).toBeVisible(); await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible() })
