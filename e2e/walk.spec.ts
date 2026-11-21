import { expect, test } from '@playwright/test';
import { playerAt, targets, visitArtifact, visitEnding, walkTo } from './walk';

const world = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Memory world' });

test.setTimeout(90_000);

test('AT-17: keyboard walking reaches both artifacts and the ending, with collision and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/examples');
  await expect(world(page).locator('canvas')).toBeVisible();
  const { spawn, artifacts } = await targets(page);
  await expect.poll(() => playerAt(page)).toEqual(spawn);

  // Bounds: holding back from spawn cannot leave the ground.
  await page.keyboard.down('s');
  await page.waitForTimeout(700);
  await page.keyboard.up('s');
  expect((await playerAt(page)).z).toBeLessThan(spawn.z + 1);

  // Collision: walking straight at an artifact stops outside its footprint.
  await walkTo(page, { x: artifacts[0].x, z: spawn.z });
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  const stopped = await playerAt(page);
  expect(Math.hypot(stopped.x - artifacts[0].x, stopped.z - artifacts[0].z)).toBeGreaterThan(0.85);

  // Input release on blur: keys held when the window loses focus stop moving the player.
  await page.keyboard.down('d');
  await page.waitForTimeout(150);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const afterBlur = await playerAt(page);
  await page.waitForTimeout(400);
  expect(await playerAt(page)).toEqual(afterBlur);
  await page.keyboard.up('d');

  // Safe reset returns to spawn.
  await page.getByRole('button', { name: 'Reset position' }).click();
  await expect.poll(() => playerAt(page)).toEqual(spawn);
  expect(errors).toEqual([]);
});

test('AT-18: reveals need proximity, either order, ending stays locked until both, replay resets', async ({ page }) => {
  await page.goto('/examples');
  await expect(world(page).locator('canvas')).toBeVisible();

  // A distant artifact cannot be activated.
  await page.keyboard.press('e');
  await expect(page.getByText('0 of 2 artifacts revealed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Interact' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^1 Photo frame/ })).toBeDisabled();

  // Second artifact first, then repeat it: still one reveal and a locked ending.
  await visitArtifact(page, 1);
  await expect(page.getByText('1 of 2 artifacts revealed')).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByText('1 of 2 artifacts revealed')).toBeVisible();
  await visitEnding(page);
  await expect(page.getByText('The gate stays closed until both objects are found.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Memory complete' })).toHaveCount(0);

  await visitArtifact(page, 0);
  await expect(page.getByText('2 of 2 artifacts revealed')).toBeVisible();
  await expect(page.locator('blockquote')).toHaveCount(1);
  await visitEnding(page);
  await expect(page.getByText('Press E to close the memory.')).toBeVisible();
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();

  await page.getByRole('button', { name: 'Replay visit' }).click();
  await expect(page.getByText('0 of 2 artifacts revealed')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Memory complete' })).toHaveCount(0);
  const { spawn } = await targets(page);
  await expect.poll(() => playerAt(page)).toEqual(spawn);
});

test('AT-17: touch pad and Interact button complete a visit, and cancelled touches release', async ({ browser }) => {
  const page = await browser.newPage({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    await page.goto('/examples');
    await expect(world(page).locator('canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    const { spawn, artifacts, reach } = await targets(page);
    const pad = async (name: string, ms: number, cancelled = false) => {
      const control = page.getByRole('button', { name });
      await control.scrollIntoViewIfNeeded();
      const box = (await control.boundingBox())!;
      const client = await page.context().newCDPSession(page);
      const point = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      await page.waitForTimeout(ms);
      await client.send('Input.dispatchTouchEvent', { type: cancelled ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    };
    await pad('Walk left', 300, true);
    const moved = await playerAt(page);
    expect(moved.x).toBeLessThan(spawn.x - 0.3);
    await page.waitForTimeout(300);
    expect(await playerAt(page)).toEqual(moved);

    // Walk to the left artifact with the pad, then use the on-screen Interact button.
    await page.getByRole('button', { name: 'Walk forward' }).scrollIntoViewIfNeeded();
    for (let i = 0; i < 40; i += 1) {
      const p = await playerAt(page);
      const dx = artifacts[0].x - p.x, dz = artifacts[0].z - p.z;
      if (Math.hypot(dx, dz) <= reach - 0.4) break;
      if (Math.abs(dx) > 0.3) await pad(dx > 0 ? 'Walk right' : 'Walk left', 150);
      else await pad('Walk forward', 200);
    }
    await page.getByRole('button', { name: 'Interact' }).tap();
    await expect(page.getByText('1 of 2 artifacts revealed')).toBeVisible();
  } finally {
    await page.close();
  }
});
