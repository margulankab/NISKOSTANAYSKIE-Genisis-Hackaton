import { expect, test } from '@playwright/test';
import { originalModelIds } from '../src/world/original-models';

test('AT-28: every original model renders with its complete geometry', async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1200, height: 950 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (let index = 0; index < Math.ceil(originalModelIds.length / 24); index++) {
    await page.goto('/e2e/support/model-gallery.html?page=' + index);
    const stats = page.locator('#gallery-stats');
    await expect(stats).toHaveAttribute('data-triangles', /^[1-9]\d+$/, { timeout: 15_000 });
    await expect(stats).toHaveAttribute('data-parts', (await stats.getAttribute('data-expected'))!);
    expect(Number(await stats.getAttribute('data-calls'))).toBeLessThanOrEqual(5);
    await page.screenshot({ path: info.outputPath(`models-${index + 1}.png`) });
  }
  await page.goto('/e2e/support/model-gallery.html');
  await page.getByRole('button', { name: 'Baseball diamond' }).click();
  await expect(page.getByRole('heading', { name: 'Baseball diamond' })).toBeVisible();
  await expect(page.getByText(/Grid lines at 1 m/)).toBeVisible();
  await page.locator('canvas').screenshot({ path: info.outputPath('diamond-orbit-preview.png') });
  await page.getByRole('button', { name: 'Return to overview' }).click();
  await expect(page.locator('#gallery-stats')).toHaveAttribute('data-triangles', /^[1-9]\d+$/);
  expect(errors).toEqual([]);
});
