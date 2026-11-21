import { expect, test } from '@playwright/test';
import { visitArtifact } from './walk';

test('the scene supplies a labeled preview without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...options: unknown[]) {
      return kind.startsWith('webgl') ? null : Reflect.apply(getContext, this, [kind, ...options]);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.getByText('Static preview', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The last light in the park' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset position' })).toHaveCount(0);
  await page.getByText('Why this scene?', { exact: true }).click();
  await expect(page.locator('.scene-explanation')).toContainText('Low trees and a path');
  await page.getByRole('button', { name: 'Play soundtrack' }).click();
  await expect.poll(() => page.locator('audio').evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause soundtrack' }).click();
  await page.getByRole('button', { name: /^1 Photo frame/ }).press('Enter');
  await page.getByRole('button', { name: /^2 Note/ }).press('Enter');
  await page.getByRole('button', { name: 'Finish memory' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();
});

test('losing the renderer keeps the current reveal and makes the preview playable', async ({ page }) => {
  await page.goto('/');
  await visitArtifact(page, 0);
  await page.locator('canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByText('Static preview', { exact: true })).toBeVisible();
  await expect(page.getByText('1 of 2 artifacts revealed')).toBeVisible();
  await page.getByRole('button', { name: /^2 Note/ }).click();
  await page.getByRole('button', { name: 'Finish memory' }).click();
  await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();
});
