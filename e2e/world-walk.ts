import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockPromptPlots } from './support/plot-fixtures';
import type { SceneDirection } from '../src/world/scene-direction';

export async function startPromptGame(page: Page, prompt: string, direction?: SceneDirection) {
  await mockPromptPlots(page, direction);
  await page.goto('/');
  await page.getByRole('link', { name: 'New Game', exact: true }).click();
  await page.getByRole('link', { name: /From a prompt/ }).click();
  await page.getByLabel('Describe the world').fill(prompt);
  await page.getByLabel(/Send this fictional prompt/).check();
  await page.getByRole('button', { name: 'Build world' }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await expect(page.locator('.walk-viewport')).toHaveAttribute('data-player', /\d/, { timeout: 12_000 });
}

export async function openLegacyPromptGame(page: Page, prompt: string, story = false) {
  await page.goto('/');
  const id = await page.evaluate(async ({ description, story }) => {
    const composePath = '/src/world/compose-scene-template.ts', storyPath = '/src/world/compose-memory-story.ts';
    const dataPath = '/src/data/indexed-memory-repository.ts', soundPath = '/src/world/prompt-soundtrack.ts';
    const { composeSceneTemplate } = await import(composePath) as typeof import('../src/world/compose-scene-template');
    const { withMemoryStory } = await import(storyPath) as typeof import('../src/world/compose-memory-story');
    const { transact, resultOf } = await import(dataPath) as typeof import('../src/data/indexed-memory-repository');
    const { promptSoundtrack } = await import(soundPath) as typeof import('../src/world/prompt-soundtrack');
    const id = crypto.randomUUID();
    const result = composeSceneTemplate(description, { id });
    const built = story ? withMemoryStory(result) : result;
    if (!built.ok) throw new Error(built.reason);
    const { world } = built;
    await transact(['worlds'], 'readwrite', tx => resultOf(tx.objectStore('worlds').put({ world, soundtrack: promptSoundtrack(world) }, id)));
    return id;
  }, { description: prompt, story });
  await page.goto(`/play/${id}`);
  await page.getByRole('button', { name: 'Restart from the beginning' }).click();
  await expect(page.locator('.walk-viewport')).toHaveAttribute('data-player', /\d/, { timeout: 12_000 });
}
