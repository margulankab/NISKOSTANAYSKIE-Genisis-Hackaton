import { expect, test } from '@playwright/test';

const PROMPT = 'An autumn park at dusk with a bench, a lamp and a pond.';

test('a song of the day shapes the soundtrack, links out, survives saving, and the world sets the atmosphere', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1')) requests.push(request.url()); });
  await page.goto('/new/prompt');
  await page.getByLabel('Describe the world').fill(PROMPT);
  await page.getByLabel('Link from your music app').fill('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=private-share-code');
  await expect(page.getByText('Recognized: Spotify track. Sharing codes are removed before saving.')).toBeVisible();
  await page.getByLabel('Artist').fill('Frank Sinatra');
  await page.getByLabel('Song', { exact: true }).fill('Fly Me to the Moon');
  await page.getByLabel('Style').selectOption('jazz');
  await page.getByLabel('Year').fill('1964');
  await expect(page.getByRole('list', { name: 'How the song shapes the world' })).toContainText('Jazz suggests nostalgic');

  await page.getByRole('button', { name: 'Build world' }).click();
  const track = page.getByLabel('Soundtrack');
  await expect(track).toHaveValue('warm-tape');
  await page.getByRole('button', { name: 'Enter world' }).click();

  const card = page.getByRole('complementary', { name: 'Song of the day' });
  const open = card.getByRole('link', { name: 'Open in Spotify' });
  await expect(open).toHaveAttribute('href', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
  await expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(card).toContainText('Frank Sinatra — Fly Me to the Moon');
  // Auto atmosphere follows the dusk world, then GENESIS returns outside it.
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'nebula');
  await expect(page.locator('.walk-compass')).toContainText(/\d+ m/);

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Save Game' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Game saved');
  await page.goto('/load');
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'genesis');
  await page.getByRole('link', { name: /Autumn Park at Dusk/ }).click();
  await expect(page.getByRole('complementary', { name: 'Song of the day' }).getByRole('link', { name: 'Open in Spotify' }))
    .toHaveAttribute('href', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
  // Nothing was sent to the music service or any other host.
  expect(requests).toEqual([]);
});

test('an unsupported link is explained and does not block building the world', async ({ page }) => {
  await page.goto('/new/prompt');
  await page.getByLabel('Describe the world').fill(PROMPT);
  await page.getByLabel('Link from your music app').fill('https://example.com/song');
  await expect(page.getByRole('alert')).toContainText('not from a supported music app');
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByRole('button', { name: 'Enter world' })).toBeVisible();
});

test('atmosphere and pixel settings apply immediately and persist', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'genesis');
  await page.getByLabel(/^Daylight:/).check();
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'daylight');
  await page.getByLabel(/^Pixel filter/).uncheck();
  await expect(page.locator('html')).toHaveAttribute('data-pixel', 'off');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'daylight');
  await page.getByRole('button', { name: '◐ View' }).click();
  await page.getByRole('group', { name: 'Interface atmosphere' }).getByRole('button', { name: /^Fog/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-ui', 'fog');
  await expect(page.getByLabel(/^Fog:/)).toBeChecked();
});
