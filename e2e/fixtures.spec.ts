import { expect, test } from '@playwright/test';
import { visitArtifact, visitEnding } from './walk';
import type { Page } from '@playwright/test';

const memories = [
  { title: 'The last light in the park', excerpt: 'The last light in the park held on after the paths emptied.' },
  { title: 'The room before the call', excerpt: 'The room before the call felt smaller than usual.' },
  { title: 'The city by the river', excerpt: 'The city by the river felt quiet enough to hear the water.' },
];

function controls(page: Page) {
  return {
    photo: page.getByRole('button', { name: /^1 Photo frame/ }),
    note: page.getByRole('button', { name: /^2 Note/ }),
    closing: page.getByRole('heading', { name: 'Memory complete' }),
  };
}

test.setTimeout(120_000);

test('three fixtures reveal exact source content, play audio, and close after both artifacts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/examples');

  const library = page.getByRole('navigation', { name: 'Test memories' });
  await expect(library.getByRole('button')).toHaveCount(3);
  const { photo, note, closing } = controls(page);
  const diorama = page.getByRole('region', { name: 'Memory world' });

  for (const [index, { title, excerpt }] of memories.entries()) {
    const fixture = library.getByRole('button', { name: new RegExp(title) });
    await fixture.click();
    await expect(fixture).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('0 of 2 artifacts revealed')).toBeVisible();
    await expect(closing).toHaveCount(0);
    await expect(page.getByRole('img')).toHaveCount(0);
    await expect(page.locator('blockquote')).toHaveCount(0);

    // Walk to one artifact, then the other; each reveal shows its exact source content.
    const first = index === 1 ? 1 : 0;
    await visitArtifact(page, first);
    await expect(page.getByText('1 of 2 artifacts revealed')).toBeVisible();
    await expect(index === 1 ? note : photo).toHaveAttribute('aria-expanded', 'true');
    await expect(index === 1 ? photo : note).toBeDisabled();
    await expect(closing).toHaveCount(0);

    await visitArtifact(page, 1 - first);
    await expect(page.locator('blockquote')).toHaveText(excerpt);
    const image = page.getByRole('img');
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(480);
    await expect(image).toHaveAttribute('src', /^blob:/);

    const audio = page.locator('audio');
    await expect(audio).toHaveAttribute('src', /^blob:/);
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).duration)).toBe(4);
    await page.getByRole('button', { name: 'Play soundtrack' }).click();
    await expect(page.getByRole('button', { name: 'Pause soundtrack' })).toBeVisible();
    await expect.poll(() => audio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Pause soundtrack' }).click();
    await expect(page.getByRole('button', { name: 'Play soundtrack' })).toBeVisible();

    await expect(page.getByText('2 of 2 artifacts revealed')).toBeVisible();
    await visitEnding(page);
    await expect(closing).toBeVisible();
  }
  await library.getByRole('button', { name: new RegExp(memories[0].title) }).click();
  await expect(page.getByText('0 of 2 artifacts revealed')).toBeVisible();
  await expect(closing).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('an undecodable artifact photo leaves the note, soundtrack, and ending usable', async ({ page }) => {
  await page.addInitScript(() => {
    const fetchAsset = window.fetch;
    window.fetch = (input, init) => {
      if (typeof input === 'string' && input.startsWith('data:image/png')) {
        return Promise.resolve(new Response('invalid image content', { headers: { 'Content-Type': 'image/png' } }));
      }
      return fetchAsset(input, init);
    };
  });
  await page.goto('/examples');
  const { photo, note, closing } = controls(page);
  await visitArtifact(page, 0);
  await expect(page.getByRole('alert')).toContainText('photo could not be opened');
  await expect(closing).toHaveCount(0);
  await visitArtifact(page, 1);
  await expect(page.locator('blockquote')).toHaveText(memories[0].excerpt);
  await page.getByRole('button', { name: 'Play soundtrack' }).click();
  await expect(page.getByRole('button', { name: 'Pause soundtrack' })).toBeVisible();
  await visitEnding(page);
  await expect(closing).toBeVisible();
});

test('switching memories pauses the old soundtrack and releases its photo and audio URLs', async ({ page }) => {
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL;
    const revoked: string[] = [];
    Object.defineProperty(window, 'revokedMemoryUrls', { value: revoked });
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
      revoke(url);
    };
  });
  await page.goto('/examples');
  await visitArtifact(page, 0);
  const image = page.getByRole('img');
  await expect(image).toHaveAttribute('src', /^blob:/);
  const photoUrl = await image.getAttribute('src');
  const audio = page.locator('audio');
  await expect(audio).toHaveAttribute('src', /^blob:/);
  const audioUrl = await audio.getAttribute('src');
  const player = await audio.elementHandle();
  await page.getByRole('button', { name: 'Play soundtrack' }).click();
  await expect(page.getByRole('button', { name: 'Pause soundtrack' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: new RegExp(memories[1].title) }).click();
  await expect.poll(() => player.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);
  const revoked = await page.evaluate(() => (window as Window & { revokedMemoryUrls?: string[] }).revokedMemoryUrls);
  expect(revoked).toEqual(expect.arrayContaining([photoUrl, audioUrl]));
});
