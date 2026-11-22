import { readFile } from 'node:fs/promises';
import { settledShot, visitArtifact, visitEnding } from './walk';
import { captureScene } from './scene-capture';
import { expect, test } from '@playwright/test';

test('the browser analyzer measures authorized WAV and MP3 audio for the v1 manifest', async ({ page }, testInfo) => {
  const mp3 = await readFile(new URL('./media/validation-tone.mp3', import.meta.url));
  await page.goto('/examples');
  const results = await page.evaluate(async (mp3Bytes) => {
    const audioModule = '/src/media/audio-analysis.ts';
    const fixturesModule = '/src/fixtures/memories.ts';
    const tonesModule = '/src/fixtures/test-tone.ts';
    const schemaModule = '/src/shared/memory-schema.ts';
    const { analyzeAudio } = await import(audioModule) as typeof import('../src/media/audio-analysis');
    const { loadFixture, fixtures } = await import(fixturesModule) as typeof import('../src/fixtures/memories');
    const { createTestTone } = await import(tonesModule) as typeof import('../src/fixtures/test-tone');
    const { memorySceneSchema, resolvePresentation } =
      await import(schemaModule) as typeof import('../src/shared/memory-schema');
    const { manifest } = await loadFixture(fixtures[0]);
    const low = createTestTone(220, 0.06);
    const high = createTestTone(220, 0.32);
    const [lowMusic, highMusic, silent, encoded] = await Promise.all([
      analyzeAudio(low.blob), analyzeAudio(high.blob), analyzeAudio(createTestTone(220, 0).blob),
      analyzeAudio(new Blob([Uint8Array.from(mp3Bytes)], { type: 'audio/mpeg' })),
    ]);
    const scenes = [lowMusic, highMusic, silent, encoded].map((music) => memorySceneSchema.parse({
      ...manifest,
      music,
      presentation: resolvePresentation(manifest.photos[0], manifest.mood, music.meanEnergy),
    }));
    const corruptRejected = await analyzeAudio(new Blob(['invalid audio'], { type: 'audio/wav' })).then(
      () => false, () => true,
    );
    return {
      scenes: scenes.map(({ music, presentation: { parameters } }) => ({
        energy: music.meanEnergy, bpm: music.bpm, key: music.key,
        speed: parameters.motionSpeed, spacing: parameters.artifactSpacing,
      })),
      wavMatchesPcm: lowMusic.energyEnvelope.every((energy, index) =>
        Math.abs(energy - low.music.energyEnvelope[index]) < 0.00001),
      tension: manifest.mood.tension,
      corruptRejected,
    };
  }, [...mp3]);
  const [low, high, silent, encoded] = results.scenes;
  await testInfo.attach('Soundtrack measurements', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });

  expect(results.wavMatchesPcm).toBe(true);
  expect(results.corruptRejected).toBe(true);
  expect(silent.energy).toBe(0);
  expect(encoded.energy).toBeGreaterThan(0);
  expect(high.energy).toBeGreaterThan(low.energy);
  expect(high.speed).toBeGreaterThan(low.speed);
  expect(high.spacing).toBeLessThan(low.spacing);
  for (const { energy, speed, spacing, bpm, key } of results.scenes) {
    expect(speed).toBe(0.25 + 0.75 * energy);
    expect(spacing).toBe(2.4 - 0.6 * results.tension + 0.3 * (1 - energy));
    expect(bpm).toBeNull();
    expect(key).toBeNull();
  }
});

test('soundtrack changes the saved composition and animates only during allowed playback', async ({ page }, testInfo) => {
  await page.goto('/examples');
  const stage = page.getByRole('region', { name: 'Memory world' });
  const canvas = stage.locator('canvas');
  const marker = stage.locator('canvas');
  const play = page.getByRole('button', { name: 'Play soundtrack' });
  const pause = page.getByRole('button', { name: 'Pause soundtrack' });
  const player = page.locator('audio');
  await expect(marker).toBeVisible();
  await settledShot(canvas);
  const quiet = await captureScene(canvas, testInfo.outputPath('quiet-composition.png'));

  await page.evaluate(async () => {
    const path = '/src/fixtures/memories.ts';
    const { fixtures } = await import(path) as typeof import('../src/fixtures/memories');
    const [quiet, loud] = fixtures;
    Object.assign(loud, quiet, { slug: loud.slug, amplitude: 0.32 });
  });
  await page.getByRole('navigation').getByRole('button').nth(1).click();
  await expect(marker).toBeVisible();
  await settledShot(canvas);
  await page.getByText('Why this scene?', { exact: true }).click();
  await expect(page.getByText(/sets movement to .* cycles per second/)).toBeVisible();
  const rest = await captureScene(canvas, testInfo.outputPath('louder-composition.png'));
  expect(rest.equals(quiet)).toBe(false);

  await player.evaluate((element: HTMLAudioElement) => {
    const nativeTime = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime')!;
    Object.defineProperty(element, 'currentTime', {
      configurable: true,
      get: () => nativeTime.get!.call(element) < 0.04 ? 0 : 0.3,
    });
  });
  const atRest = async () => (await captureScene(canvas)).equals(rest);
  // Continuous rendering makes captures slower; loop the 4 s clip so it cannot end mid-comparison.
  await player.evaluate((element: HTMLAudioElement) => { element.loop = true; });
  await play.click();
  await expect(pause).toBeVisible();
  await expect.poll(atRest).toBe(false);
  await canvas.screenshot({ path: testInfo.outputPath('louder-in-motion.png') });
  await player.evaluate((element: HTMLAudioElement) => {
    Object.defineProperty(element, 'readyState', { value: HTMLMediaElement.HAVE_CURRENT_DATA, configurable: true });
    element.dispatchEvent(new Event('waiting'));
  });
  await expect.poll(atRest).toBe(true);
  await expect(pause).toBeVisible();
  await player.evaluate((element: HTMLAudioElement) => {
    Reflect.deleteProperty(element, 'readyState');
    element.dispatchEvent(new Event('playing'));
  });
  await expect.poll(atRest).toBe(false);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(atRest).toBe(true);
  await expect(pause).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(atRest).toBe(false);

  await pause.click();
  await expect.poll(atRest).toBe(true);
  await player.evaluate((element: HTMLAudioElement) => { element.loop = false; Reflect.deleteProperty(element, 'currentTime'); });
  await play.click();
  await player.evaluate((element: HTMLAudioElement) => { element.currentTime = 3.85; });
  await expect.poll(() => player.evaluate((element: HTMLAudioElement) => element.ended)).toBe(true);
  await expect(play).toBeVisible();
  await expect.poll(atRest).toBe(true);
});

test('a soundtrack error leaves both reveals and the ending available', async ({ page }) => {
  await page.addInitScript(() => {
    const createUrl = URL.createObjectURL;
    URL.createObjectURL = (object) => object instanceof Blob && object.type === 'audio/wav'
      ? createUrl(new Blob(['invalid soundtrack'], { type: 'audio/wav' }))
      : createUrl(object);
  });
  await page.goto('/examples');
  await expect(page.getByRole('alert')).toContainText('The soundtrack could not play.');
  await visitArtifact(page, 0);
  await visitArtifact(page, 1);
  await visitEnding(page);
  await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();
});
