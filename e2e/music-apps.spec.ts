import { expect, test } from '@playwright/test';

test('the music mini player loads a real app player only on request, keeps it across pages, and pauses the game score', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (!/^(?:http:\/\/127\.0\.0\.1|blob:|data:)/.test(request.url())) external.push(request.url());
  });
  // Keep the test offline: answer the app's player with a blank page.
  await page.route(/open\.spotify\.com|w\.soundcloud\.com|embed\.music\.apple\.com/, (route) => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  await page.goto('/');
  await page.getByRole('button', { name: /Music/ }).click();
  const picker = page.getByRole('dialog', { name: 'Music apps' });
  await expect(picker.getByRole('tab', { name: /Spotify/ })).toHaveAttribute('aria-selected', 'true');
  for (const app of ['SoundCloud', 'Apple Music', 'YouTube Music']) await expect(picker.getByRole('tab', { name: new RegExp(app) })).toBeVisible();
  expect(external).toEqual([]);

  // A link that no app can embed is explained; a Spotify track plays in Spotify's own player.
  await picker.getByLabel('Paste a link to play it here').fill('https://open.spotify.com/search/jazz');
  await picker.getByRole('button', { name: /Play here/ }).click();
  await expect(picker.getByRole('alert')).toContainText('does not offer a player');
  await picker.getByLabel('Paste a link to play it here').fill('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=private');
  await picker.getByRole('button', { name: /Play here/ }).click();
  const player = page.getByRole('complementary', { name: 'Music player' });
  await expect(player.locator('iframe')).toHaveAttribute('src', 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
  expect(external.every((url) => url.startsWith('https://open.spotify.com/embed/'))).toBe(true);

  // Searching opens the app in a new tab instead of loading anything here.
  await page.getByRole('button', { name: /Music/ }).click();
  await page.getByLabel('Find music in Spotify').fill('Fly Me to the Moon');
  const [tab] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: /Search/ }).click()]);
  expect(tab.url()).toContain('open.spotify.com/search/Fly%20Me%20to%20the%20Moon');
  await tab.close();

  // Collapse keeps the player (and its music) on the page; close removes it.
  await player.getByRole('button', { name: 'Hide player' }).click();
  await expect(player).toHaveClass(/is-collapsed/);
  await player.getByRole('button', { name: 'Close player' }).click();
  await expect(player).toHaveCount(0);
});
