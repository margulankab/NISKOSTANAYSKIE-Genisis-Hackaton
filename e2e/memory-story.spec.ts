import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { captureScene } from './scene-capture';
import { settledShot, walkToGoal } from './walk';

const prompt = 'At dusk I met Mira near a lighthouse above a foggy cove with a red rowboat beside a pier.';
const fictionalMarket = 'At a covered night market under a railway bridge I met Nora near the blue bench beside a lamp.';

async function openPrompt(page: Page, description = prompt) {
  await page.goto('/new/prompt');
  await page.getByLabel('Describe the world').fill(description);
}

async function saveAndContinue(page: Page) {
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Save & Quit' }).click();
  await page.getByRole('link', { name: /Continue/ }).click();
}

async function revealInStaticPreview(page: Page) {
  await expect(page.locator('.static-note')).toContainText('the 3D world is unavailable');
  for (const count of [1, 2]) {
    await page.getByRole('button', { name: /Reveal$/ }).first().click();
    await expect(page.getByText(`${count} of 2 discoveries found`)).toBeVisible();
  }
}

test('a private memory can be walked, saved in the conversation, and reopened with the selected reply', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const storyRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/memory-story')) storyRequests.push(request.url());
  });
  await openPrompt(page);
  await page.getByRole('button', { name: 'Build memory' }).click();
  await expect(page.getByText(/Written locally/)).toBeVisible();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await expect(page.getByText(/before meeting Mira/)).toBeVisible();

  for (const index of [0, 1] as const) {
    await walkToGoal(page, { kind: 'artifact', index });
    await page.keyboard.press('e');
    await expect(page.getByText(`${index + 1} of 2 discoveries found`)).toBeVisible();
  }

  await walkToGoal(page, { kind: 'ending', ready: true });
  await expect(page.getByText('Press E to talk to Mira.')).toBeVisible();
  await page.keyboard.press('e');
  const conversation = page.getByRole('region', { name: 'Memory conversation' });
  await expect(conversation.getByRole('heading', { name: 'Mira' })).toBeVisible();
  const canvas = page.locator('.walk-viewport canvas');
  await settledShot(canvas);
  await captureScene(canvas, testInfo.outputPath('memory-character.png'));
  await saveAndContinue(page);
  await expect(conversation).toBeVisible();
  await conversation.getByRole('button', { name: 'The way it felt to be here.' }).click();
  const ending = page.getByRole('region', { name: 'Memory complete' });
  await expect(ending).toContainText('Then stay another breath.');
  await expect(page.locator('.story-stage')).toHaveClass(/story-stage-ended/);
  await saveAndContinue(page);
  await expect(ending).toContainText('Then stay another breath.');
  await ending.getByRole('button', { name: 'Replay visit' }).click();
  await expect(page.getByText('0 of 2 discoveries found')).toBeVisible();
  expect(storyRequests).toEqual([]);
});

test('a fictional prompt can use structured Gemini output and falls back on invalid output in the static preview', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...options: unknown[]) {
      return kind.startsWith('webgl') ? null : Reflect.apply(getContext, this, [kind, ...options]);
    } as typeof getContext;
  });
  let valid = true;
  await page.route('**/api/memory-story', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ prompt: fictionalMarket, fictional: true });
    await route.fulfill({ json: valid ? {
      scene: 'A covered night market under a railway bridge with lanterns above the stalls and a blue bench beside a lamp.',
      place: 'Night market', timeOfDay: 'night', weather: 'clear', mood: 'lively',
      opening: 'The stalls are closing as you arrive.', npc: { name: 'Nora', outfit: 'ochre' },
      firstDiscovery: 'Warm light pools on the ground.', secondDiscovery: 'The last footsteps echo under the bridge.',
      greeting: 'Do you remember the walk home?',
      firstReply: { choice: 'Every step.', answer: 'So do I.' },
      secondReply: { choice: 'Just the lights.', answer: 'They stay with me too.' },
      closing: 'The market falls quiet.',
    } : { scene: 'Invalid response' } });
  });
  await openPrompt(page, fictionalMarket);
  await page.getByRole('checkbox', { name: /Send this fictional prompt/ }).check();
  await page.getByRole('button', { name: 'Build memory' }).click();
  await expect(page.getByText(/Night market · lively · Written with Gemini/)).toBeVisible();
  await expect(page.getByLabel('Soundtrack', { exact: true })).toHaveValue('lantern-market');
  await page.getByRole('button', { name: 'Enter world' }).click();
  await revealInStaticPreview(page);
  await page.getByRole('button', { name: 'Talk to Nora' }).click();
  await expect(page.getByText('Do you remember the walk home?')).toBeVisible();
  await page.getByRole('button', { name: 'Just the lights.' }).click();
  await expect(page.getByRole('region', { name: 'Memory complete' })).toContainText('They stay with me too.');

  valid = false;
  await openPrompt(page, fictionalMarket);
  await page.getByRole('checkbox', { name: /Send this fictional prompt/ }).check();
  await page.getByRole('button', { name: 'Build memory' }).click();
  await expect(page.getByText('This memory was generated locally.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Describe the world')).toHaveValue(fictionalMarket);
  await page.getByRole('button', { name: 'Enter world' }).click();
  await revealInStaticPreview(page);
  await page.getByRole('button', { name: 'Talk to Nora' }).click();
  await page.getByRole('button', { name: 'One small detail.' }).click();
  await expect(page.getByRole('region', { name: 'Memory complete' })).toContainText('find your way back here');
});
