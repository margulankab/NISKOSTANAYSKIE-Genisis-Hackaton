import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createTestTone } from '../src/fixtures/test-tone';

const text = 'I watched the last light drain from the river before walking home.';
const photo = {
  name: 'park.png',
  mimeType: 'image/png',
  buffer: await readFile(new URL('../src/fixtures/media/nostalgic-park.png', import.meta.url)),
};
const audio = {
  name: 'tone.wav',
  mimeType: 'audio/wav',
  buffer: Buffer.from(await createTestTone(220, 0.09).blob.arrayBuffer()),
};
const mp3 = {
  name: 'validation-tone.mp3',
  mimeType: 'audio/mpeg',
  buffer: await readFile(new URL('./media/validation-tone.mp3', import.meta.url)),
};

async function fillDraft(page: Page) {
  await page.getByLabel('Date', { exact: true }).fill('2026-10-04');
  await page.getByLabel('What happened that day?').fill(text);
  await page.getByLabel('Photos', { exact: true }).setInputFiles(photo);
  await page.getByLabel('Audio excerpt', { exact: true }).setInputFiles(audio);
  await page.getByRole('checkbox').check();
}

function submit(page: Page) {
  return page.getByRole('button', { name: 'Validate draft' }).click();
}

test('validates a local draft from the fixture-library link with the browser offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Create a memory' }).click();
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await context.setOffline(true);
  await fillDraft(page);
  await page.getByLabel('Audio excerpt', { exact: true }).setInputFiles({ ...audio, mimeType: 'audio/x-wav' });
  await submit(page);
  await expect(page.getByRole('status')).toHaveText('Draft ready for 2026-10-04. 1 photo and one audio excerpt validated.');
  await expect(page.getByRole('alert')).toHaveCount(0);

  const converted = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    return ['image/jpeg', 'image/webp'].map((mime) => canvas.toDataURL(mime).split(',')[1]);
  });
  await page.getByLabel('Photos', { exact: true }).setInputFiles([
    photo,
    { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(converted[0], 'base64') },
    { name: 'test.webp', mimeType: 'image/webp', buffer: Buffer.from(converted[1], 'base64') },
  ]);
  await page.getByLabel('Audio excerpt', { exact: true }).setInputFiles(mp3);
  await submit(page);
  await expect(page.getByRole('status')).toHaveText('Draft ready for 2026-10-04. 3 photos and one audio excerpt validated.');
});

test('rejects missing fields, excess photos, and oversized photos and audio before decoding', async ({ page }) => {
  await page.goto('/create');
  await page.getByLabel('Date', { exact: true }).fill('');
  await submit(page);
  for (const message of [
    'Enter a valid date.', 'Write 20 to 6,000 characters about your day.', 'Choose one to three photos.',
    'Choose one authorized audio file.', 'Confirm permission to use the selected media.',
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }

  await fillDraft(page);
  const photos = page.getByLabel('Photos', { exact: true });
  const audioInput = page.getByLabel('Audio excerpt', { exact: true });
  await photos.setInputFiles(Array.from({ length: 4 }, (_, index) => ({ ...photo, name: `photo-${index}.png` })));
  await submit(page);
  await expect(page.getByText('Choose one to three photos.')).toBeVisible();

  await photos.setInputFiles({ ...photo, buffer: Buffer.alloc(5 * 1024 ** 2 + 1) });
  await audioInput.setInputFiles({ ...audio, buffer: Buffer.alloc(10 * 1024 ** 2 + 1) });
  await submit(page);
  await expect(page.getByText(/Choose a nonempty photo up to 5 MiB/)).toBeVisible();
  await expect(page.getByText(/Choose a nonempty audio file up to 10 MiB/)).toBeVisible();
});

test('rejects mismatched MIME and corrupt media and retains the journal and valid selection on retry', async ({ page }) => {
  await page.goto('/create');
  await fillDraft(page);
  const photos = page.getByLabel('Photos', { exact: true });
  const audioInput = page.getByLabel('Audio excerpt', { exact: true });
  await photos.setInputFiles({ ...photo, mimeType: 'image/jpeg' });
  await audioInput.setInputFiles({ ...audio, mimeType: 'audio/mpeg' });
  await submit(page);
  await expect(page.getByText(/The file type does not match its contents/)).toHaveCount(2);

  await photos.setInputFiles({ ...photo, buffer: photo.buffer.subarray(0, 20) });
  await audioInput.setInputFiles({ ...audio, buffer: audio.buffer.subarray(0, 12) });
  await submit(page);
  await expect(page.getByText(/Choose a photo file your browser can open/)).toBeVisible();
  await expect(page.getByText(/Choose a sound file your browser can open/)).toBeVisible();

  await photos.evaluate((element: HTMLInputElement, base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'photo-with-no-extension'));
    element.files = transfer.files;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, photo.buffer.toString('base64'));
  await submit(page);
  await expect(page.getByText(/Choose a sound file your browser can open/)).toBeVisible();
  await expect(page.getByLabel('What happened that day?')).toHaveValue(text);
  await expect(photos).toHaveValue(/photo-with-no-extension$/);

  await audioInput.setInputFiles(audio);
  await submit(page);
  await expect(page.getByRole('status')).toContainText('Draft ready');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('rejects a decodable photo over 16 megapixels and decodable audio outside 1–90 seconds', async ({ page }) => {
  await page.goto('/create');
  await fillDraft(page);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4001;
    canvas.height = 4000;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const shortAudio = Buffer.from(audio.buffer.subarray(0, 44 + 8000 * 2));
  shortAudio.writeUInt32LE(shortAudio.length - 8, 4);
  shortAudio.writeUInt32LE(shortAudio.length - 44, 40);

  await page.getByLabel('Photos', { exact: true }).setInputFiles({ ...photo, buffer: Buffer.from(png, 'base64') });
  await page.getByLabel('Audio excerpt', { exact: true }).setInputFiles({ ...audio, buffer: shortAudio });
  await submit(page);
  await expect(page.getByText(/Choose a photo with at most 16 megapixels/)).toBeVisible();
  await expect(page.getByText(/Choose an audio excerpt from 1 to 90 seconds/)).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);

  const longAudio = Buffer.alloc(44 + 16000 * 91 * 2);
  audio.buffer.copy(longAudio, 0, 0, 44);
  longAudio.writeUInt32LE(longAudio.length - 8, 4);
  longAudio.writeUInt32LE(longAudio.length - 44, 40);
  await page.getByLabel('Photos', { exact: true }).setInputFiles(photo);
  await page.getByLabel('Audio excerpt', { exact: true }).setInputFiles({ ...audio, buffer: longAudio });
  await submit(page);
  await expect(page.getByText(/Choose an audio excerpt from 1 to 90 seconds/)).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('generates and plays a memory offline using the original entry and selected media', async ({ page, context }) => {
  await page.goto('/create');
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await context.setOffline(true);
  await fillDraft(page);
  await submit(page);
  await page.getByRole('button', { name: 'Generate memory' }).click();
  await expect(page.getByRole('status')).toHaveText('Memory preview ready.');
  await expect(page.getByRole('heading', { name: 'Remembering last light drain' })).toBeVisible();
  await expect(page.locator('blockquote')).toHaveText(text);
  const memoryPhoto = page.getByRole('img', { name: 'Photo from your memory' });
  await expect.poll(() => memoryPhoto.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(480);
  await page.getByRole('button', { name: 'Play audio excerpt' }).click();
  await expect(page.getByRole('button', { name: 'Pause audio excerpt' })).toBeVisible();
  const player = await page.locator('audio').elementHandle();
  await expect.poll(() => player.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await page.getByLabel('What happened that day?').fill(`${text} Then I went home.`);
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(await player.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  expect(requests).toEqual([]);
});

test('retains the draft on generation failure and recovers with a replacement photo', async ({ page }) => {
  await page.goto('/create');
  await fillDraft(page);
  const photos = page.getByLabel('Photos', { exact: true });
  const audioInput = page.getByLabel('Audio excerpt', { exact: true });
  const transparentPng = await page.evaluate(() => document.createElement('canvas').toDataURL().split(',')[1]);
  await photos.setInputFiles({ ...photo, name: 'transparent.png', buffer: Buffer.from(transparentPng, 'base64') });
  await submit(page);
  await page.getByRole('button', { name: 'Generate memory' }).click();
  await expect(page.getByRole('alert')).toContainText('The memory could not be generated.');
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(photos).toHaveValue(/transparent\.png$/);
  await expect(audioInput).toHaveValue(/tone\.wav$/);
  await expect(page.getByLabel('What happened that day?')).toHaveValue(text);
  await page.getByRole('button', { name: 'Retry generation' }).click();
  await expect(page.getByRole('alert')).toContainText('The memory could not be generated.');

  await photos.setInputFiles(photo);
  await submit(page);
  await page.getByRole('button', { name: 'Generate memory' }).click();
  await expect(page.getByRole('status')).toHaveText('Memory preview ready.');
  await expect(page.locator('blockquote')).toHaveText(text);
  await expect(page.getByRole('alert')).toHaveCount(0);

  const fallbackText = '✨🌿'.repeat(12);
  await page.getByLabel('What happened that day?').fill(fallbackText);
  await submit(page);
  await page.getByRole('button', { name: 'Generate memory' }).click();
  await expect(page.getByRole('status')).toHaveText('Local draft with neutral mood and setting.');
  await expect(page.getByRole('heading', { name: 'Remembering The Day 2026-10-04' })).toBeVisible();
  await expect(page.locator('blockquote')).toHaveText(fallbackText);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
