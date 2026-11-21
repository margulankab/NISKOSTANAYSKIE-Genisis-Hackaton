import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { targetAt } from '../src/gameplay/controller';
import type { Target } from '../src/gameplay/controller';
import type { WalkLayout } from '../src/gameplay/layout';
import { routeTo } from '../src/world/route';

interface Pt { x: number; z: number }
interface Targets { spawn: Pt; artifacts: Pt[]; landmark: Pt; reach: number }

const viewport = (page: Page) => page.locator('.walk-viewport');

export async function targets(page: Page): Promise<Targets | WalkLayout> {
  return JSON.parse((await viewport(page).getAttribute('data-walk-targets'))!);
}

export async function playerAt(page: Page): Promise<Pt> {
  await expect(viewport(page)).toHaveAttribute('data-player', /\d/);
  const [x, z] = (await viewport(page).getAttribute('data-player'))!.split(',').map(Number);
  return { x, z };
}

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function goTo(page: Page, goal: Pt, within: number) {
  let stalled = 0;
  let last = await playerAt(page);
  for (let i = 0; i < 200; i += 1) {
    const p = await playerAt(page);
    stalled = Math.hypot(p.x - last.x, p.z - last.z) < 0.01 ? stalled + 1 : 0;
    if (stalled > 8) throw new Error('walk is stuck at ' + JSON.stringify(p));
    last = p;
    const dx = goal.x - p.x, dz = goal.z - p.z;
    if (Math.hypot(dx, dz) <= within) return;
    const horizontal = Math.abs(dx) >= Math.abs(dz);
    const distance = horizontal ? Math.abs(dx) : Math.abs(dz);
    const ms = Math.max(30, Math.min(300, (distance - within) / 3.2 * 1000 * 0.8));
    await hold(page, horizontal ? (dx > 0 ? 'd' : 'a') : (dz > 0 ? 's' : 'w'), ms);
  }
  throw new Error('walk did not reach ' + JSON.stringify(goal));
}

/** Walk the open front edge first, then straight to the goal, stopping inside reach. */
export async function walkTo(page: Page, goal: Pt) {
  const { spawn, reach } = await targets(page);
  await goTo(page, { x: goal.x, z: spawn.z }, 0.15);
  await goTo(page, goal, reach - 0.4);
}

export async function walkToGoal(page: Page, goal: Target) {
  const layout = await targets(page);
  if (!('solids' in layout)) {
    return walkTo(page, goal.kind === 'artifact' ? layout.artifacts[goal.index] : layout.landmark);
  }
  let lastError: unknown;
  const matchTarget = (position: Pt) => JSON.stringify(targetAt(position, layout, 2,
    goal.kind === 'ending' ? [true, true] : goal.index === 0 ? [false, true] : [true, false])) === JSON.stringify(goal);
  for (const clearance of [0.16, 0.1, 0.05, 0]) {
    const position = await playerAt(page);
    if (matchTarget(position)) return;
    const route = routeTo({ ...layout, playerRadius: layout.playerRadius + clearance }, goal, position);
    if (!route) continue;
    try {
      for (const waypoint of route) await goTo(page, waypoint, 0.09);
      if (matchTarget(await playerAt(page))) return;
      lastError = new Error('The last waypoint did not offer a clear interaction.');
    } catch (error) {
      // Replan from the observed position if the browser rounds a movement at a corner.
      lastError = error;
    }
  }
  throw lastError ?? new Error('No route to ' + JSON.stringify(goal));
}

export async function visitArtifact(page: Page, index: number) {
  if (index !== 0 && index !== 1) throw new Error('Unknown discovery ' + index);
  await walkToGoal(page, { kind: 'artifact', index });
  await page.keyboard.press('e');
}

export async function visitEnding(page: Page) {
  await walkToGoal(page, { kind: 'ending', ready: true });
  await page.keyboard.press('e');
}

/** Screenshot a canvas once two consecutive captures agree, so first-frame sizing cannot skew comparisons. */
export async function settledShot(canvas: import('@playwright/test').Locator, path?: string) {
  let previous = await canvas.screenshot();
  for (let i = 0; i < 30; i += 1) {
    await canvas.page().waitForTimeout(150);
    const next = await canvas.screenshot();
    if (next.equals(previous)) return path ? canvas.screenshot({ path }) : next;
    previous = next;
  }
  throw new Error('The canvas never settled.');
}
