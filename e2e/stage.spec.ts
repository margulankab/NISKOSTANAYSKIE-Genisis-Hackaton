import { expect, test } from '@playwright/test';

test('3D controls orbit, zoom, and reset the rendered diorama', async ({ page }) => {
  await page.goto('/');
  const canvas = page.getByRole('region', { name: 'Memory diorama' }).locator('canvas');
  await expect(canvas).toBeVisible();
  const viewport = await canvas.boundingBox();
  if (!viewport) throw new Error('The stage has no visible canvas.');
  const initial = await canvas.screenshot();
  const x = viewport.x + viewport.width * 0.25;
  const y = viewport.y + viewport.height * 0.55;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 110, y - 25, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(false);

  const orbited = await canvas.screenshot();
  await page.mouse.wheel(0, -150);
  await expect.poll(async () => (await canvas.screenshot()).equals(orbited)).toBe(false);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(true);
});

test('a touch drag orbits the stage at a narrow viewport', async ({ browser }) => {
  const page = await browser.newPage({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    await page.goto('/');
    const canvas = page.getByRole('region', { name: 'Memory diorama' }).locator('canvas');
    await canvas.scrollIntoViewIfNeeded();
    const viewport = await canvas.boundingBox();
    if (!viewport) throw new Error('The touch stage has no visible canvas.');
    const initial = await canvas.screenshot();
    const client = await page.context().newCDPSession(page);
    const x = Math.round(viewport.x + viewport.width * 0.26);
    const y = Math.round(viewport.y + viewport.height * 0.55);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 95, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await canvas.screenshot()).equals(initial)).toBe(false);
    const orbited = await canvas.screenshot();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }, { x: x + 100, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 32, y }, { x: x + 132, y }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await canvas.screenshot()).equals(orbited)).toBe(false);
  } finally {
    await page.close();
  }
});

test('the scene supplies a labeled preview without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...options: unknown[]) {
      return kind.startsWith('webgl') ? null : Reflect.apply(getContext, this, [kind, ...options]);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.getByText('Static preview', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The last light in the park' })).toBeVisible();
});
