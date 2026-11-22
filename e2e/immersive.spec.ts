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

test.describe('full screen (the default for players)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Enter world animates straight into a full-screen world; Esc-style menu opens in the middle with tabs', async ({ page }) => {
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

    // Nothing beside the world: the stage covers the whole screen, and the quest log and first line are on it.
    const stage = page.locator('.memory-stage');
    const box = (await stage.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
    await expect(page.getByRole('region', { name: 'Quests' })).toContainText('Find the');
    await expect(page.locator('.dialog-box')).toBeVisible();

    // The in-world Menu opens a centered game menu; the music stops, Journal and Settings are tabs.
    await page.getByRole('button', { name: 'Menu' }).click();
    const menu = page.getByRole('dialog');
    await expect(menu.getByRole('button', { name: 'Resume' })).toBeFocused();
    const card = (await menu.boundingBox())!;
    expect(Math.abs(card.x + card.width / 2 - viewport.width / 2)).toBeLessThan(4);
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
    await menu.getByRole('tab', { name: /Journal/ }).click();
    await expect(menu.getByRole('tabpanel')).toContainText('Find the');
    await menu.getByRole('tab', { name: /Settings/ }).click();
    await menu.getByRole('button', { name: 'Third person' }).click();
    await expect(page.locator('.walk-viewport')).toHaveAttribute('data-view', 'third');
    await menu.getByRole('tab', { name: /Game/ }).click();
    await menu.getByRole('button', { name: 'Resume' }).click();
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);

    // Leaving full screen from the menu keeps the world open in the window.
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Exit full screen' }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
    await page.getByRole('dialog').getByRole('button', { name: 'Return to Main Menu' }).click();
    await page.getByRole('button', { name: 'Leave without saving' }).click();
    await expect(page.getByRole('heading', { name: 'Memory Worlds' })).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-immersive', 'on');
  });

  test('a saved world opened from Continue offers Play, which goes full screen', async ({ page }) => {
    await page.goto('/new/prompt');
    await page.getByLabel('Describe the world').fill(PROMPT);
    await page.getByRole('button', { name: 'Build world' }).click();
    await page.getByRole('button', { name: 'Enter world' }).click();
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Save & Quit' }).click();
    await page.getByRole('link', { name: /Continue/ }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveCount(0);
  });
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
