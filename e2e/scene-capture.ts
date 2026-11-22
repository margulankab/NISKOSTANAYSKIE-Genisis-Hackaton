import type { Locator } from '@playwright/test';

export async function captureScene(canvas: Locator, path?: string) {
  const page = canvas.page();
  await page.evaluate(() => window.scrollTo(0, 0));
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('The preview canvas could not be measured');
  const { x, y, width, height } = bounds;
  return page.screenshot({ path, fullPage: true, clip: {
    x: Math.ceil(x) + 4, y: Math.ceil(y) + 4, width: Math.floor(width) - 8, height: Math.floor(height) - 8,
  }, style: `
    body::after, .stage-viewport::after, .stage-overlay, .walk-prompt, .walk-compass, .walk-interact { visibility: hidden !important; }
  ` });
}

export async function sameScene(canvas: Locator, expected: Buffer) {
  const actual = await captureScene(canvas);
  if (actual.equals(expected)) return true;
  return canvas.page().evaluate(async ([reference, comparison]) => {
    async function pixels(png: string) {
      const data = Uint8Array.from(atob(png), byte => byte.charCodeAt(0));
      const image = await createImageBitmap(new Blob([data], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(image.width, image.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      image.close();
      return context.getImageData(0, 0, canvas.width, canvas.height);
    }
    const [left, right] = await Promise.all([pixels(reference), pixels(comparison)]);
    return left.width === right.width && left.height === right.height &&
      left.data.every((channel, index) => Math.abs(channel - right.data[index]) <= 1);
  }, [expected.toString('base64'), actual.toString('base64')]);
}
