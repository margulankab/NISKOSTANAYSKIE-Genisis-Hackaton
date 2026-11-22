import { expect, test } from '@playwright/test';
import { directedScene } from './support/plot-fixtures';
import { startPromptGame } from './world-walk';

test('scene reasons follow the selected music and ambience pauses and mutes in the visit', async ({ page }) => {
  await page.addInitScript(() => {
    const BrowserAudio = window.AudioContext;
    window.AudioContext = class ObservedAudio extends BrowserAudio {
      constructor() {
        super();
        this.addEventListener('statechange', () => { document.documentElement.dataset.sceneAudio = this.state; });
        document.documentElement.dataset.sceneAudio = this.state;
      }
    };
  });
  await startPromptGame(page, 'park', directedScene);
  const html = page.locator('html');
  await page.getByRole('button', { name: 'Enable scene sound' }).click();
  await expect(html).toHaveAttribute('data-scene-audio', 'running');
  await page.getByRole('button', { name: 'Mute scene sound' }).click();
  await expect(html).toHaveAttribute('data-scene-audio', 'suspended');
  await page.getByRole('button', { name: 'Unmute scene sound' }).click();
  await expect(html).toHaveAttribute('data-scene-audio', 'running');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(html).toHaveAttribute('data-scene-audio', 'suspended');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(html).toHaveAttribute('data-scene-audio', 'running');
  await page.getByText('Why this scene?', { exact: true }).click();
  const notes = page.locator('.scene-explanation');
  await expect(notes).toContainText('Warm Tape');
  await page.getByLabel('Soundtrack', { exact: true }).selectOption('night-drive');
  await expect(notes).toContainText('Night Drive');
  await expect(notes).toContainText('Selected by the player.');
  await expect(notes).not.toContainText(directedScene.reasons.audio);
});
