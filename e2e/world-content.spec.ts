import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { captureScene, sameScene } from './scene-capture';
import { settledShot } from './walk';

test('world preview renders resolved geometry and responds to gesture-started catalog playback', async ({ page }, testInfo) => {
  // World preview is a direct page now; the main navigation keeps only Library, New game and Settings.
  await page.goto('/world-preview');
  await expect(page).toHaveURL(/\/world-preview$/);
  await expect(page.getByRole('heading', { name: 'World preview' })).toBeVisible();
  const canvas = page.getByRole('region', { name: 'Foggy cove' }).locator('canvas');
  const audio = page.locator('audio');
  const preview = page.getByRole('button', { name: 'Preview soundtrack' });
  await expect(page.getByText('Matched cues: cove.')).toBeVisible();
  await expect(page.getByText(/cleared for in-game playback, portable export/i)).toBeVisible();
  await expect.poll(() => audio.evaluate((player: HTMLAudioElement) => player.paused)).toBe(true);
  // On-screen size; the pixel filter deliberately renders fewer pixels and scales them up.
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.clientHeight)).toBeGreaterThan(250);
  await canvas.screenshot({ path: testInfo.outputPath('foggy-cove.png') });

  await page.getByLabel('Soundtrack', { exact: true }).selectOption('lantern-market');
  await expect(page.getByText('Selected by the player.')).toBeVisible();
  await settledShot(canvas);
  const rest = await captureScene(canvas);
  await preview.click();
  await expect.poll(() => audio.evaluate((player: HTMLAudioElement) => player.currentTime)).toBeGreaterThan(0);
  await expect.poll(() => sameScene(canvas, rest)).toBe(false);
  await page.getByRole('button', { name: 'Pause soundtrack' }).click();
  await expect(preview).toBeVisible();
  await expect.poll(() => sameScene(canvas, rest)).toBe(true);
  await preview.click();
  await expect.poll(() => sameScene(canvas, rest)).toBe(false);
  await page.getByRole('checkbox', { name: 'Mute soundtrack' }).check();
  await expect.poll(() => audio.evaluate((player: HTMLAudioElement) => player.muted)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => sameScene(canvas, rest)).toBe(true);
  const oldPlayer = await audio.elementHandle();
  await page.getByLabel('Soundtrack', { exact: true }).selectOption('still-rooms');
  await expect(preview).toBeVisible();
  await expect.poll(() => audio.evaluate((player: HTMLAudioElement) => player.paused)).toBe(true);
  expect(await oldPlayer?.evaluate((player: HTMLAudioElement) => player.paused)).toBe(true);

  await preview.click();
  await expect.poll(() => audio.evaluate((player: HTMLAudioElement) => player.paused)).toBe(false);
  const covePlayer = await audio.elementHandle();
  await page.getByLabel('Example world').selectOption('market');
  await expect(page.getByText('Matched cues: market.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Mute soundtrack' })).toBeChecked();
  await expect.poll(() => audio.evaluate((player: HTMLAudioElement) => [player.paused, player.muted])).toEqual([true, true]);
  expect(await covePlayer?.evaluate((player: HTMLAudioElement) => player.paused)).toBe(true);
  const market = page.getByRole('region', { name: 'Covered night market' }).locator('canvas');
  await expect.poll(() => market.evaluate((element: HTMLCanvasElement) => element.clientHeight)).toBeGreaterThan(250);
  await market.screenshot({ path: testInfo.outputPath('covered-night-market.png') });
  await page.getByRole('checkbox', { name: 'Mute soundtrack' }).uncheck();

  await page.getByLabel('Example world').selectOption('cove');
  await expect(page.getByLabel('Soundtrack', { exact: true })).toHaveValue('still-rooms');
  await expect.poll(() => audio.evaluate((player: HTMLAudioElement) => [player.paused, player.muted])).toEqual([true, false]);
});

test('landmark buttons and Overview frame the route and remain readable on fallback', async ({ page }) => {
  await page.goto('/world-preview');
  const viewport = page.getByRole('region', { name: 'Foggy cove' });
  const canvas = viewport.locator('canvas');
  const overview = page.getByRole('button', { name: 'Overview' });
  const views = page.getByRole('group', { name: 'Landmarks in route order' });
  await expect(views.getByRole('button')).toHaveText(['Overview', 'Lighthouse', 'Red rowboat', 'Pier']);
  await expect(overview).toBeEnabled();
  await settledShot(canvas);
  const opening = await captureScene(canvas);
  await overview.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Lighthouse' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => sameScene(canvas, opening)).toBe(false);
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Space');
  await expect.poll(() => sameScene(canvas, opening)).toBe(true);

  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('The preview canvas could not be measured');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 25, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => sameScene(canvas, opening)).toBe(false);
  await overview.click();
  await expect.poll(() => sameScene(canvas, opening)).toBe(true);

  await canvas.dispatchEvent('webglcontextlost');
  await expect(viewport.getByRole('status')).toContainText('3D preview is unavailable');
  await expect(overview).toBeDisabled();
  await expect(page.getByText(/the route leads to the lighthouse and red rowboat/i)).toBeVisible();
  await page.getByRole('button', { name: 'Preview soundtrack' }).click();
  await expect(page.getByRole('button', { name: 'Pause soundtrack' })).toBeVisible();
});

test('both worlds fit a narrow touch viewport', async ({ browser }, testInfo) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    const base = testInfo.project.use.baseURL;
    await page.goto(new URL('/world-preview', base).href);
    for (const [id, title, landmark] of [
      ['cove', 'Foggy cove', 'Red rowboat'],
      ['market', 'Covered night market', 'Market stall'],
    ]) {
      await page.getByLabel('Example world').selectOption(id);
      const canvas = page.getByRole('region', { name: title }).locator('canvas');
      const view = page.getByRole('button', { name: landmark });
      await expect(view).toBeEnabled();
      expect(await page.locator('html').evaluate((root) => root.scrollWidth)).toBe(390);
      const overview = await canvas.screenshot({ path: testInfo.outputPath(id + '-mobile.png') });
      await view.tap();
      await expect.poll(async () => (await canvas.screenshot()).equals(overview)).toBe(false);
      await canvas.screenshot({ path: testInfo.outputPath(id + '-landmark-mobile.png') });
    }
  } finally {
    await page.close();
  }
});

test('silent and missing choices can recover with a cleared track or authorized file', async ({ page }) => {
  await page.goto('/e2e/support/world-preview.html?audio=missing');
  await expect(page.getByRole('alert')).toContainText('The saved soundtrack is unavailable');
  await page.getByLabel('Soundtrack', { exact: true }).selectOption('still-rooms');
  await expect(page.getByRole('button', { name: 'Preview soundtrack' })).toBeVisible();

  await page.goto('/e2e/support/world-preview.html?audio=unsuitable');
  await expect(page.getByText(/Silent world. No cleared soundtrack matched/)).toBeVisible();
  await page.getByText('Upload an authorized soundtrack', { exact: true }).click();
  const input = page.getByLabel('MP3 or WAV soundtrack');
  await expect(input).toBeDisabled();
  await page.getByRole('checkbox', { name: /I have permission/ }).check();
  await input.setInputFiles({ name: 'corrupt.wav', mimeType: 'audio/wav', buffer: Buffer.from('invalid') });
  await expect(page.getByRole('alert')).toContainText('Choose an MP3 or WAV');
  await input.setInputFiles({
    name: 'validation-tone.mp3', mimeType: 'audio/mpeg',
    buffer: await readFile(new URL('./media/validation-tone.mp3', import.meta.url)),
  });
  await expect(page.getByText('Uploaded by the player.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preview soundtrack' })).toBeVisible();
});
