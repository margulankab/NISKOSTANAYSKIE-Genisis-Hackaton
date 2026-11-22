import { expect, test } from '@playwright/test';
import { startPromptGame } from './world-walk';
import { directedScene } from './support/plot-fixtures';
import { playMoment } from './walk';

test('the built app reopens a saved plot offline', async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_PRODUCTION !== '1', 'Run with the production Vite preview.');
  await startPromptGame(page, 'park', directedScene);
  await playMoment(page, 1);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Save & Quit' }).click();
  const continuation = page.getByRole('link', { name: /Continue/ });
  await expect(continuation).toBeVisible();
  const href = await continuation.getAttribute('href');
  expect(href).toMatch(/^\/play\//);
  await context.setOffline(true);
  await page.goto(href!);
  await expect(page.getByText('1 of 1 moments complete')).toBeVisible();
  await expect(page.locator('.walk-viewport')).toHaveAttribute('data-player', /\d/);
  await page.getByText('Why this scene?', { exact: true }).click();
  await expect(page.getByLabel('Scene colors')).toContainText(directedScene.palette.horizon);
});
