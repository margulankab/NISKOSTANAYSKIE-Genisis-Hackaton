import { expect, test } from '@playwright/test';

test('each fixture reopens with its illustration, original excerpt, and playable tone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');

  const titles = ['The last light in the park', 'The room before the call', 'The city by the river'];
  const library = page.getByRole('navigation', { name: 'Test memories' });
  await expect(library.getByRole('button')).toHaveCount(3);
  for (const title of titles) {
    const fixture = library.getByRole('button', { name: new RegExp(title) });
    await fixture.click();
    await expect(fixture).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('blockquote')).toContainText(title);
    const image = page.getByRole('img');
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(480);
    await expect(image).toHaveAttribute('src', /^blob:/);

    const audio = page.locator('audio');
    await expect(audio).toHaveAttribute('src', /^blob:/);
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).duration)).toBe(4);
    await page.getByRole('button', { name: 'Play test tone' }).click();
    await expect(page.getByRole('button', { name: 'Pause test tone' })).toBeVisible();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Pause test tone' }).click();
    await expect(page.getByRole('button', { name: 'Play test tone' })).toBeVisible();
  }
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});
