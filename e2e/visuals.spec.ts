import { expect, test } from '@playwright/test';
import { settledShot } from './walk';

test('analyzes local photo pixels, including transparent and corrupt input', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const path = '/src/media/photo-analysis.ts';
    const { analyzePhoto } = await import(path) as typeof import('../src/media/photo-analysis');
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    const encode = () => new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode test image.')));
    });
    const failure = (blob: Blob) => analyzePhoto(blob).then(() => 'unexpected success', (error: Error) => error.message);

    const transparent = await failure(await encode());
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 192, 96);
    const solid = await analyzePhoto(await encode());
    canvas.width = 3;
    canvas.height = 1;
    for (const [index, color] of ['#ff0000', '#00ff00', '#0000ff'].entries()) {
      ctx.fillStyle = color;
      ctx.fillRect(index, 0, 1, 1);
    }
    const ties = await analyzePhoto(await encode());
    const corrupt = await failure(new Blob(['invalid raster'], { type: 'image/png' }));
    return { transparent, solid, ties, corrupt };
  });
  expect(results.solid).toEqual({
    width: 192, height: 96, palette: [[255, 255, 255], [255, 255, 255], [255, 255, 255]], meanLightness: 1,
  });
  expect(results.ties.palette).toEqual([[0, 0, 255], [0, 255, 0], [255, 0, 0]]);
  expect(results.ties.meanLightness).toBeCloseTo(1 / 3);
  expect(results.transparent).toMatch(/fully transparent/);
  expect(results.corrupt).toMatch(/could not be decoded/);
});

test('each fixture keeps the shared framing and explains the treatment it renders', async ({ page }, testInfo) => {
  await page.goto('/');
  const stage = page.getByRole('region', { name: 'Memory world' });
  const examples = [
    { name: /nostalgic.*park/i, setting: 'Park.', treatment: 'Layered photo mounts' },
    { name: /tense.*room/i, setting: 'Room.', treatment: 'Angled mounts' },
    { name: /calm.*city/i, setting: 'City.', treatment: 'Straight mounts' },
  ];
  const screenshots: Buffer[] = [];
  let stageSize: { width: number; height: number } | undefined;
  for (const { name, setting, treatment } of examples) {
    await page.getByRole('navigation').getByRole('button', { name }).click();
    await expect(stage.locator('canvas')).toBeVisible();
    await page.getByText('Why this scene?', { exact: true }).click();
    const explanation = page.locator('.scene-explanation');
    await expect(explanation).toContainText(setting);
    await expect(explanation).toContainText(treatment);
    await expect(explanation).toContainText('measured audio energy');
    const canvas = stage.locator('canvas');
    await settledShot(canvas);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Missing fixture canvas.');
    const { width, height } = box;
    stageSize ??= { width, height };
    expect({ width, height }).toEqual(stageSize);
    const shot = await stage.locator('.stage-viewport').screenshot({ path: testInfo.outputPath(setting.slice(0, -1) + '.png') });
    for (const previous of screenshots) expect(shot.equals(previous)).toBe(false);
    screenshots.push(shot);
  }
});

test('changing only fixture context or photo features changes its rendered stage', async ({ page }) => {
  await page.goto('/');
  const stage = page.getByRole('region', { name: 'Memory world' });
  const marker = stage.locator('canvas');
  await expect(marker).toBeVisible();
  const original = await settledShot(stage.locator('canvas'));
  await page.evaluate(async () => {
    const path = '/src/fixtures/memories.ts';
    const { fixtures } = await import(path) as typeof import('../src/fixtures/memories');
    const [park, room, city] = fixtures;
    Object.assign(room, park, { slug: room.slug, context: { ...park.context, environment: 'room' } });
    Object.assign(city, park, {
      slug: city.slug,
      palette: [[8, 70, 198], [11, 40, 93], [140, 180, 249]],
      lightness: 0.15,
    });
  });
  const days = page.getByRole('navigation').getByRole('button');
  for (const [index, expected] of [[1, 'Room.'], [2, 'Image brightness 15%']] as const) {
    await days.nth(index).click();
    await expect(marker).toBeVisible();
    await page.getByText('Why this scene?', { exact: true }).click();
    await expect(page.locator('.scene-explanation')).toContainText(expected);
    if (index === 2) await expect(page.locator('.scene-explanation')).toContainText('rgb(8, 70, 198)');
    expect((await stage.locator('canvas').screenshot()).equals(original)).toBe(false);
  }
});
