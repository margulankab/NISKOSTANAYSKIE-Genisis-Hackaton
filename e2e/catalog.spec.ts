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
  expect(errors).toEqual([]);
});
