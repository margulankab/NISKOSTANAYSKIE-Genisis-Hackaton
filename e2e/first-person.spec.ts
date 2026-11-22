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
