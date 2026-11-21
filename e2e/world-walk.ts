import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Target } from '../src/gameplay/controller';
import { composeWorld } from '../src/world/compose-world';
import { routeTo } from '../src/world/route';
import { toWalkLayout } from '../src/world/world-schema';
import { playerAt } from './walk';

/** The same layout the browser builds: it depends on the prompt and seed, not the world ID. */
export function layoutFor(prompt: string) {
  const result = composeWorld(prompt, { id: '00000000-0000-4000-8000-000000000000' });
  if (!result.ok) throw new Error(result.reason);
  return toWalkLayout(result.world.layout);
}

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Follow the computed route leg by leg with arrow keys, then stop inside reach of the goal. */
export async function walkToGoal(page: Page, prompt: string, goal: Target) {
  const layout = layoutFor(prompt);
  const route = routeTo(layout, goal, await playerAt(page));
  if (!route) throw new Error('No route to ' + JSON.stringify(goal));
  for (const waypoint of route.slice(1)) {
    for (let i = 0; ; i += 1) {
      if (i > 60) throw new Error('Walk stalled near ' + JSON.stringify(await playerAt(page)));
      const p = await playerAt(page);
      const dx = waypoint.x - p.x, dz = waypoint.z - p.z;
      if (Math.abs(dx) <= 0.08 && Math.abs(dz) <= 0.08) break;
      const horizontal = Math.abs(dx) >= Math.abs(dz);
      const distance = horizontal ? Math.abs(dx) : Math.abs(dz);
      await hold(page, horizontal ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dz > 0 ? 'ArrowDown' : 'ArrowUp'),
        Math.max(20, Math.min(400, (distance / 3.2) * 1000 * 0.75)));
    }
  }
}

export async function startPromptGame(page: Page, prompt: string) {
  await page.goto('/');
  await page.getByRole('link', { name: 'New Game' }).click();
  await page.getByRole('link', { name: /From a prompt/ }).click();
  await page.getByLabel('Describe the world').fill(prompt);
  await page.getByRole('button', { name: 'Build world' }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await expect(page.locator('.walk-viewport')).toHaveAttribute('data-player', /\d/);
}
