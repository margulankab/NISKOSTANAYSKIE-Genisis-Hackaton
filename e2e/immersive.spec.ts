import { expect, test } from '@playwright/test';

const PROMPT = 'An autumn park at dusk with a bench, a lamp and a pond.';

test('the interface switches to Russian, persists, and Russian prompts set the time of day', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Русский' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('navigation', { name: 'Титульное меню' })).toContainText('Новая игра');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Главное меню' })).toBeVisible();

  await page.goto('/new/prompt');
  await page.getByLabel('Опишите мир').fill('Ночной парк у пруда, скамейка и фонарь.');
  await page.getByRole('button', { name: 'Собрать мир' }).click();
  await page.getByRole('button', { name: 'Войти в мир' }).click();
  await expect(page.getByText('Найдено 0 из 2')).toBeVisible();
  // A night world turns the automatic interface atmosphere to GENESIS night.
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'genesis');

  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'В главное меню' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Выйти без сохранения' }).click();
  await page.getByRole('group', { name: 'Язык' }).getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Main menu' })).toBeVisible();
});

test('Enter world plays the transition, goes full screen and starts the matched soundtrack', async ({ page }) => {
  await page.goto('/new/prompt');
  await page.getByLabel('Describe the world').fill(PROMPT);
  await page.getByRole('button', { name: 'Build world' }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();

  // The typed words carry into the transition, then it clears without blocking input.
  await expect(page.locator('.warp-words')).toContainText('An autumn park at dusk');
  await expect(page.locator('.warp')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('html')).toHaveAttribute('data-immersive', 'on');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  const audio = page.locator('audio');
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => !element.paused && element.currentTime > 0)).toBe(true);
  await expect(page.getByRole('button', { name: 'Pause soundtrack' })).toBeVisible();

  // Leaving full screen with our own button keeps playing; the pause menu still stops the music.
  await page.getByRole('button', { name: 'Exit full screen' }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);

  // Leaving the world restores the normal page layout.
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Return to Main Menu' }).click();
  await page.getByRole('button', { name: 'Leave without saving' }).click();
  await expect(page.getByRole('heading', { name: 'Memory Worlds' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-immersive', 'on');
});

test('with autoplay and full screen turned off, Enter world stays windowed and silent', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Start the soundtrack when I enter a world').uncheck();
  await page.getByLabel('Switch to full screen when I enter a world').uncheck();
  await page.goto('/new/prompt');
  await page.getByLabel('Describe the world').fill(PROMPT);
  await page.getByRole('button', { name: 'Build world' }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await expect(page.getByRole('button', { name: 'Preview soundtrack' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(await page.locator('audio').evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
});
