import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { visitArtifact } from './walk';
import type { Page } from '@playwright/test';
import { unzipSync, zipSync } from 'fflate';
import { createTestTone } from '../src/fixtures/test-tone';

const firstEntry = 'I watched the last light drain from the river before walking home.';
const secondEntry = 'I watched the last light drain from the river before catching the bus.';
const title = 'Remembering last light drain';
const root = `${title}/`;
const photoBytes = await readFile(new URL('../src/fixtures/media/nostalgic-park.png', import.meta.url));
const otherPhotoBytes = await readFile(new URL('../src/fixtures/media/calm-city.png', import.meta.url));
const audioBytes = Buffer.from(await createTestTone(220, 0.09).blob.arrayBuffer());

async function generate(page: Page, date = '2026-10-04', entry = firstEntry) {
  await page.goto('/create');
  await page.getByLabel('Date', { exact: true }).fill(date);
  await page.getByLabel('What happened that day?').fill(entry);
  await page.getByLabel('Photos', { exact: true }).setInputFiles({ name: 'river.png', mimeType: 'image/png', buffer: photoBytes });
  await page.getByLabel('Audio excerpt', { exact: true }).setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: audioBytes });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Validate draft' }).click();
  await page.getByRole('button', { name: 'Generate memory' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

async function save(page: Page) {
  await page.getByRole('button', { name: 'Save to archive' }).click();
  const link = page.getByRole('link', { name: 'Open saved memory' });
  await expect(link).toBeVisible();
  return (await link.getAttribute('href'))!;
}

async function download(page: Page) {
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export ZIP' }).click();
  const file = await waiting;
  expect(file.suggestedFilename()).toBe(`${title}.zip`);
  return readFile(await file.path());
}

async function upload(page: Page, bytes: Uint8Array) {
  await page.getByLabel('Memory ZIP', { exact: true }).setInputFiles({
    name: 'memory.zip', mimeType: 'application/zip', buffer: Buffer.from(bytes),
  });
  await page.getByRole('button', { name: 'Import ZIP' }).click();
}

function inspect(bytes: Uint8Array) {
  const entries = unzipSync(bytes);
  const readText = (key: string) => new TextDecoder().decode(entries[root + key]);
  expect(readText('entry.txt')).toBe(firstEntry);
  const manifest = JSON.parse(readText('manifest.json'));
  const credits = JSON.parse(readText('credits.json'));
  expect(Object.keys(entries).sort()).toEqual([
    root + 'manifest.json', root + 'entry.txt', root + 'credits.json',
    root + `photos/${manifest.source.photoIds[0]}.png`, root + `audio/${manifest.source.audioId}.wav`,
  ].sort());
  expect(credits).toMatchObject({ formatVersion: 1, photos: [{ filename: 'river.png', mime: 'image/png' }],
    audio: { filename: 'tone.wav', mime: 'audio/wav' } });
  expect(credits.rights).toHaveLength(2);
  expect(Buffer.from(entries[root + `photos/${manifest.source.photoIds[0]}.png`])).toEqual(photoBytes);
  expect(Buffer.from(entries[root + `audio/${manifest.source.audioId}.wav`])).toEqual(audioBytes);
  return entries;
}

test('saves duplicate titles, reloads the archive, and reopens the stored bundle byte for byte', async ({ page }) => {
  await generate(page);
  const original = inspect(await download(page));
  const first = await save(page);
  await generate(page, '2026-10-05', secondEntry);
  const second = await save(page);
  expect(second).not.toBe(first);

  await page.getByRole('link', { name: 'Archive', exact: true }).click();
  await page.reload();
  const choices = page.getByRole('list', { name: 'Saved memories' }).getByRole('link');
  await expect(choices).toHaveCount(2);
  await expect(choices.nth(0)).toHaveAttribute('href', second);
  await expect(choices.nth(1)).toHaveAttribute('href', first);
  await choices.nth(0).click();
  await visitArtifact(page, 1);
  await expect(page.locator('blockquote')).toHaveText(secondEntry);
  await page.getByRole('link', { name: 'Back to archive' }).click();
  await choices.nth(1).click();
  await visitArtifact(page, 1);
  await expect(page.locator('blockquote')).toHaveText(firstEntry);
  expect(unzipSync(await download(page))).toEqual(original);
});

test('imports a deflated ZIP into a fresh profile, reopens it, and rejects invalid variations atomically', async ({ page, browser }) => {
  await generate(page);
  const original = inspect(await download(page));
  const withPreview: Record<string, Uint8Array> = { ...original, [`${root}preview.png`]: new Uint8Array(photoBytes) };
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await other.goto(new URL('/archive', page.url()).href);
    await expect(other.getByText('No saved memories yet.')).toBeVisible();
    const valid = zipSync(withPreview, { level: 6 });
    await upload(other, valid);
    const imported = other.getByRole('link', { name: 'Open imported memory' });
    await expect(imported).toBeVisible();
    const href = (await imported.getAttribute('href'))!;
    await upload(other, valid);
    await expect(imported).toHaveAttribute('href', href);
    const choices = other.getByRole('list', { name: 'Saved memories' }).getByRole('link');
    await expect(choices).toHaveCount(1);

    const entry = root + 'entry.txt';
    const media = Object.keys(original).find((path) => path.startsWith(`${root}photos/`))!;
    const manifest = root + 'manifest.json';
    const { [media]: removedPhoto, ...withoutPhoto } = withPreview;
    expect(removedPhoto).toBeDefined();
    const encoded = (value: string) => new TextEncoder().encode(value);
    const variations: [Record<string, Uint8Array>, RegExp][] = [
      [{ ...withPreview, [entry]: encoded(`${firstEntry} I added a detail.`) }, /different memory already uses this ID/],
      [{ ...withPreview, [media]: otherPhotoBytes }, /different memory already uses this ID/],
      [{ ...withPreview, [`${root}../entry.txt`]: encoded('Unexpected path') }, /unexpected path/],
      [withoutPhoto, /missing a required memory file/],
      [{ ...withPreview, [media]: encoded('Unreadable photo') }, /unreadable photo or audio/],
      [{ ...withPreview, [manifest]: encoded('{"schemaVersion":2}') }, /unsupported memory version/],
    ];
    for (const [files, message] of variations) {
      await upload(other, zipSync(files, { level: 0 }));
      await expect(other.getByRole('alert')).toContainText(message);
      await expect(choices).toHaveCount(1);
      await expect(choices.first()).toHaveAttribute('href', href);
    }

    await choices.first().click();
    await visitArtifact(other, 1);
    await expect(other.locator('blockquote')).toHaveText(firstEntry);
    await other.getByRole('button', { name: 'Play soundtrack' }).click();
    await expect.poll(() => other.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
    expect(unzipSync(await download(other))).toEqual(withPreview);
  } finally {
    await context.close();
  }
});

test('a quota failure preserves the preview, allows ZIP export, and rolls back the archive write', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === 'media') throw new DOMException('Simulated full archive', 'QuotaExceededError');
      return add.call(this, value, key);
    };
  });
  await generate(page);
  await page.getByRole('button', { name: 'Save to archive' }).click();
  await expect(page.getByRole('alert')).toContainText('archive storage is full');
  await expect(page.getByRole('link', { name: 'Open saved memory' })).toHaveCount(0);
  await visitArtifact(page, 1);
  await expect(page.locator('blockquote')).toHaveText(firstEntry);
  inspect(await download(page));
  await page.getByRole('link', { name: 'Archive', exact: true }).click();
  await expect(page.getByText('No saved memories yet.')).toBeVisible();
  await page.goto('/memory/80463325-9914-44c7-9008-fefa57d76bde');
  await expect(page.getByRole('alert')).toHaveText('This memory was not found in this browser.');
});
