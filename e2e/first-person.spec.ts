import { expect, test } from '@playwright/test';
import { playerAt } from './walk';

const PROMPT = 'A sunny park with a gazebo, benches, flowers and birch trees.';

async function enter(page: import('@playwright/test').Page) {
  await page.goto('/new/prompt');
  await page.getByLabel('Describe the world').fill(PROMPT);
  await page.getByRole('button', { name: 'Build world' }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
}

test('worlds open in first person: turning looks around, W walks where you look, V switches view', async ({ page }) => {
  await enter(page);
  const viewport = page.locator('.walk-viewport');
  await expect(viewport).toHaveAttribute('data-view', 'first');
  await expect(page.locator('.walk-reticle')).toBeVisible();
  await expect(page.getByText(/drag or ← → to look/)).toBeVisible();

  // Turning on the spot changes the view but not the position.
  const start = await playerAt(page);
  const canvas = viewport.locator('canvas');
  const before = await canvas.screenshot();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowRight');
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  expect(await playerAt(page)).toEqual(start);

  // Facing right of the path, forward now also moves toward +x.
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await expect.poll(async () => (await playerAt(page)).x).toBeGreaterThan(start.x + 0.2);
  expect((await playerAt(page)).z).toBeLessThan(start.z);

  // V switches to the over-the-shoulder camera, and the choice is saved.
  await page.locator('.game-header h2').click();
  await page.keyboard.press('v');
  await expect(viewport).toHaveAttribute('data-view', 'third');
  await expect(page.locator('.walk-reticle')).toHaveCount(0);
  await page.goto('/settings');
  await expect(page.getByLabel('Third person')).toBeChecked();
  await page.getByLabel('First person').check();
  await expect(page.getByLabel('Ink outlines and toon shading on 3D worlds')).toBeChecked();
});

test('dragging on the world looks around in first person', async ({ page }) => {
  await enter(page);
  const canvas = page.locator('.walk-viewport canvas');
  const start = await playerAt(page);
  const before = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  expect(await playerAt(page)).toEqual(start);
});

test('a tap of Shift toggles shift lock, holding Shift runs, and Space never scrolls the page', async ({ page }) => {
  await enter(page);
  const viewport = page.locator('.walk-viewport');
  await expect(viewport).toHaveAttribute('data-shift-lock', 'off');
  // Space interacts instead of scrolling.
  const scrolled = await page.evaluate(() => window.scrollY);
  await page.keyboard.press(' ');
  await page.keyboard.press(' ');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);

  await page.keyboard.press('Shift');
  await expect(viewport).toHaveAttribute('data-shift-lock', 'on');
  await expect(page.getByRole('status').filter({ hasText: 'Shift lock on' })).toBeVisible();
  // In shift lock the mouse turns the camera without a drag, and the walker stays put.
  const start = await playerAt(page);
  const canvas = viewport.locator('canvas');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await canvas.screenshot();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  expect(await playerAt(page)).toEqual(start);

  // Holding Shift while walking runs and keeps shift lock as it is.
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  await expect(viewport).toHaveAttribute('data-shift-lock', 'on');
  await page.keyboard.press('Shift');
  await expect(viewport).toHaveAttribute('data-shift-lock', 'off');
});

test('the memory library shows saved worlds beside the five example days and filters them', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Save Game' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Game saved');
  await page.goto('/library');
  const shelf = page.getByRole('list', { name: 'Memories' });
  await expect(shelf.getByRole('link')).toHaveCount(6);
  await expect(shelf.getByRole('link').first()).toContainText('Sunny Park');
  await page.getByRole('group', { name: 'Show' }).getByRole('button', { name: /Examples/ }).click();
  await expect(shelf.getByRole('link')).toHaveCount(5);
  await shelf.getByRole('link', { name: /The last light in the park/ }).click();
  await expect(page).toHaveURL(/\/examples\/nostalgic-park$/);
});
