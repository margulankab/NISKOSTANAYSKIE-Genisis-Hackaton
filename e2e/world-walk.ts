import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
export async function startPromptGame(page: Page, prompt: string) {
  await page.goto('/');
  await page.getByRole('link', { name: 'New Game', exact: true }).click();
  await page.getByRole('link', { name: /From a prompt/ }).click();
  await page.getByLabel('Describe the world').fill(prompt);
  await page.getByRole('button', { name: 'Build world' }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await expect(page.locator('.walk-viewport')).toHaveAttribute('data-player', /\d/, { timeout: 12_000 });
}
