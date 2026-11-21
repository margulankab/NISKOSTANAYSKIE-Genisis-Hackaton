import type { Locator } from '@playwright/test';

export async function captureScene(canvas: Locator, path?: string) {
  const page = canvas.page();
  await page.evaluate(() => window.scrollTo(0, 0));
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('The preview canvas could not be measured');
  // Compare the rendered scene inside the viewport border.
  const { x, y, width, height } = bounds;
  return page.screenshot({ path, clip: {
    x: Math.ceil(x) + 4, y: Math.ceil(y) + 4,
    width: Math.floor(width) - 8, height: Math.floor(height) - 8,
  } });
}
