import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { captureScene } from './scene-capture';
import { playerAt, settledShot, walkToGoal } from './walk';
import { startPromptGame } from './world-walk';

const lighthouse = 'A lighthouse above a foggy cove with a red rowboat beside a pier.';
const market = 'A covered night market under a railway bridge, with lanterns above the stalls and a blue bench beside a lamp.';

async function pause(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
}

test('AT-25: start from the title menu, save mid-visit, Continue, finish, Save & Quit and Load Game', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await expect(page.getByText('No saved game yet')).toBeVisible();
  await startPromptGame(page, lighthouse);
  await expect(page.getByRole('heading', { name: 'Lighthouse Above a Foggy Cove' })).toBeVisible();

  await walkToGoal(page, { kind: 'artifact', index: 0 });
  await page.keyboard.press('e');
  await expect(page.getByText('1 of 2 discoveries found')).toBeVisible();
  await expect(page.locator('.artifact-card blockquote')).toHaveText('a red rowboat beside a pier');
  const saved = await playerAt(page);
  const track = page.getByLabel('Soundtrack', { exact: true });
  await expect(track).toHaveValue('coastal-light');
  await expect(page.getByText(/Memory Worlds. Cleared for in-game playback/)).toBeVisible();
  await track.selectOption('still-rooms');
  await page.getByLabel('Mute soundtrack').check();
  const canvas = page.getByRole('region', { name: 'Prompt world' }).locator('canvas');
  await settledShot(canvas);
  const still = await captureScene(canvas, testInfo.outputPath('generated-cove.png'));
  await page.getByRole('button', { name: 'Preview soundtrack' }).click();
  const audio = page.locator('audio');
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await expect.poll(async () => (await captureScene(canvas)).equals(still)).toBe(false);

  await pause(page);
  await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowUp');
  expect(await playerAt(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Save Game' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Game saved in this browser.');

  await page.reload();
  await page.goto('/');
  const resume = page.getByRole('link', { name: /Continue/ });
  await expect(resume).toContainText('Lighthouse Above a Foggy Cove');
  await expect(resume).toContainText('1 of 2 discoveries');
  await resume.click();
  await expect(page.getByText('1 of 2 discoveries found')).toBeVisible();
  await expect.poll(async () => {
    const p = await playerAt(page);
    return Math.hypot(p.x - saved.x, p.z - saved.z);
  }).toBeLessThan(0.01);

  await expect(track).toHaveValue('still-rooms');
  await expect(page.getByLabel('Mute soundtrack')).toBeChecked();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBe(0);
  await page.getByLabel('Mute soundtrack').uncheck();
  await page.getByRole('button', { name: 'Preview soundtrack' }).click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);

  await walkToGoal(page, { kind: 'artifact', index: 1 });
  await page.keyboard.press('e');
  await expect(page.getByText('2 of 2 discoveries found')).toBeVisible();
  await walkToGoal(page, { kind: 'ending', ready: true });
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'World complete' })).toBeVisible();

  await pause(page);
  await page.getByRole('button', { name: 'Save & Quit' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Load Game' }).click();
  const entry = page.getByRole('link', { name: /Lighthouse Above a Foggy Cove/ });
  await expect(entry).toContainText('Completed');
  await entry.click();
  await expect(page.getByRole('heading', { name: 'World complete' })).toBeVisible();
  await expect(page.getByText('2 of 2 discoveries found')).toBeVisible();
});

test('AT-25: a failed save keeps the session open, and leaving unsaved progress asks first', async ({ page }) => {
  await startPromptGame(page, market);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowUp');

  await pause(page);
  await page.getByRole('button', { name: 'Return to Main Menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();

  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  });
  await page.getByRole('button', { name: 'Save Game' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('out of storage space');
  await expect(page.locator('.game-header h2')).toHaveText(/Covered Night Market/);
  await page.getByRole('button', { name: 'Save & Quit' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('out of storage space');
  await expect(page).toHaveURL(/\/new\/prompt$/);

  await page.evaluate(() => (window as unknown as { restorePut: () => void }).restorePut());
  await page.getByRole('button', { name: 'Save Game' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Game saved in this browser.');
  await page.getByRole('button', { name: 'Return to Main Menu' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: /Continue/ })).toContainText('0 of 2 discoveries');
});

test('AT-25: an invalid checkpoint offers a labeled restart from spawn', async ({ page }) => {
  await startPromptGame(page, lighthouse);
  await pause(page);
  await page.getByRole('button', { name: 'Save & Quit' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('memory-worlds');
    open.onsuccess = () => {
      const tx = open.result.transaction('checkpoints', 'readwrite');
      const store = tx.objectStore('checkpoints');
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (current) current.update({ ...current.value, position: { x: 40, z: 0 } });
      };
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
  await page.getByRole('link', { name: /Continue/ }).click();
  await expect(page.getByRole('alert')).toHaveText('The saved position is outside the walkable area.');
  await page.getByRole('button', { name: 'Restart from the beginning' }).click();
  await expect(page.getByText('0 of 2 discoveries found')).toBeVisible();
});

test('AT-25: a version 1 archive is upgraded in place and its days appear in Load Game', async ({ page }) => {
  await page.goto('/settings');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('memory-worlds', 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('days');
      open.result.createObjectStore('media');
    };
    open.onsuccess = () => {
      const tx = open.result.transaction('days', 'readwrite');
      tx.objectStore('days').put({ manifest: { id: 'legacy-day', title: 'Last light on the river', date: '2026-10-04' } }, 'legacy-day');
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
  await page.goto('/load');
  const day = page.getByRole('link', { name: /Last light on the river/ });
  await expect(day).toContainText('Day memory · 2026-10-04');
  await expect(day).toHaveAttribute('href', '/memory/legacy-day');
});

test('AT-23: unsupported details are listed and a failed prompt is kept for revision', async ({ page }) => {
  await page.goto('/new/prompt');
  const field = page.getByLabel('Describe the world');
  await field.fill('Just a feeling of warmth and a carousel.');
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByRole('alert')).toContainText('None of the described places or objects have a builder yet');
  await expect(page.getByText(/Not built yet:.*carousel/)).toBeVisible();
  await expect(field).toHaveValue('Just a feeling of warmth and a carousel.');

  await field.fill('A carousel beside a red lighthouse at dusk.');
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByText(/Not built yet:.*carousel/)).toBeVisible();
  await page.getByRole('button', { name: 'Revise prompt' }).click();
  await expect(field).toHaveValue('A carousel beside a red lighthouse at dusk.');
});

test('the new game menu offers the prompt game and the case day-memory flow', async ({ page }) => {
  await page.goto('/new');
  await page.getByRole('link', { name: /Create a day memory/ }).click();
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.getByLabel('What happened that day?')).toBeVisible();
});

for (const [name, prompt, track] of [
  ['covered market', market, 'lantern-market'],
  ['mixed world', 'A quiet kitchen with a wooden table, then a garden with two oak trees and a carousel beyond the house.', 'still-rooms'],
]) {
  test(`AT-23/24: walks both discoveries and the ending in a ${name}`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await startPromptGame(page, prompt);
    await expect(page.getByLabel('Soundtrack', { exact: true })).toHaveValue(track);
    await captureScene(page.getByRole('region', { name: 'Prompt world' }).locator('canvas'), testInfo.outputPath('generated-world.png'));
    for (const index of [0, 1] as const) {
      await walkToGoal(page, { kind: 'artifact', index });
      await page.keyboard.press('e');
      await expect(page.getByText(`${index + 1} of 2 discoveries found`)).toBeVisible();
    }
    await walkToGoal(page, { kind: 'ending', ready: true });
    await page.keyboard.press('e');
    await expect(page.getByRole('heading', { name: 'World complete' })).toBeVisible();
  });
}

test('AT-24: a missing saved soundtrack can be replaced, and a failed update rolls back both writes', async ({ page }) => {
  await startPromptGame(page, market);
  await pause(page);
  await page.getByRole('button', { name: 'Save & Quit' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('memory-worlds');
    open.onsuccess = () => {
      const tx = open.result.transaction('worlds', 'readwrite');
      const cursor = tx.objectStore('worlds').openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (row) row.update({ ...row.value, soundtrack: { ...row.value.soundtrack, blob: null } });
      };
      tx.oncomplete = () => { open.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
  await page.getByRole('link', { name: /Continue/ }).click();
  await expect(page.getByRole('alert')).toContainText('The saved soundtrack is unavailable');
  const track = page.getByLabel('Soundtrack', { exact: true });
  await track.selectOption('coastal-light');
  await expect(page.getByRole('button', { name: 'Preview soundtrack' })).toBeVisible();
  await page.locator('.game-header h2').click();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowUp');

  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (this.name === 'checkpoints') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return original.call(this, value, key);
    };
  });
  await pause(page);
  await page.getByRole('button', { name: 'Save Game' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('out of storage space');
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('The saved soundtrack is unavailable');
  await expect(track).toHaveValue('lantern-market');
  const position = await playerAt(page);
  expect(position).toEqual({ x: 0, z: 5.6 });

  await track.selectOption('coastal-light');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Save Game' }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Game saved');
  await page.reload();
  await expect(track).toHaveValue('coastal-light');
  await expect(page.getByRole('button', { name: 'Preview soundtrack' })).toBeVisible();
});

test('AT-25: Continue reopens a prompt save written before the scenery and soundtrack integration', async ({ page }) => {
  await page.goto('/settings');
  await page.evaluate(async () => {
    const composerPath = '/src/world/compose-world.ts';
    const checkpointPath = '/src/world/checkpoint.ts';
    const databasePath = '/src/data/indexed-memory-repository.ts';
    const { composeWorld } = await import(composerPath) as typeof import('../src/world/compose-world');
    const { createCheckpoint } = await import(checkpointPath) as typeof import('../src/world/checkpoint');
    const { transact, resultOf } = await import(databasePath) as typeof import('../src/data/indexed-memory-repository');
    const id = '6f1b3c1e-8d4f-4a52-9a5e-2b7c9d0e1f23';
    const composed = composeWorld('A garden with a wooden bench and a lantern.', { id });
    if (!composed.ok) throw new Error(composed.reason);
    const { geometryVersion: _version, ...layout } = composed.world.layout;
    const legacy = { ...composed.world, versions: { ...composed.world.versions, layout: 1 as const, catalog: 1 as const }, layout };
    const checkpoint = createCheckpoint(legacy, {
      position: { x: 0, z: 4 }, revealed: new Set([layout.discoveries[0].placementId]), ended: false,
    });
    await transact(['worlds', 'checkpoints'], 'readwrite', async (tx) => {
      await Promise.all([
        resultOf(tx.objectStore('worlds').put(legacy, id)),
        resultOf(tx.objectStore('checkpoints').put(checkpoint, id)),
      ]);
    });
  });
  await page.goto('/');
  await page.getByRole('link', { name: /Continue/ }).click();
  await expect(page.getByText('1 of 2 discoveries found')).toBeVisible();
  await expect(page.getByText(/This saved world has no soundtrack/)).toBeVisible();
  expect(await playerAt(page)).toEqual({ x: 0, z: 4 });
});
