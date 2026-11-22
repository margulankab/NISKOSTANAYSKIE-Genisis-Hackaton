import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { captureScene } from './scene-capture';
import { playMoment, playerAt, settledShot, walkToGoal } from './walk';
import { catchGame, directedScene, homeRun, plotResponse } from './support/plot-fixtures';
import { openLegacyPromptGame, startPromptGame } from './world-walk';

const prompt = 'At dusk I met Mira in a garden with a wooden bench, a lantern and a gazebo.';
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

test('a legacy memory can be walked, saved in the conversation, and reopened with the selected reply', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const storyRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/scene-plan')) storyRequests.push(request.url());
  });
  await openLegacyPromptGame(page, prompt, true);
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

test('Gemini moments can be completed in the static preview, and invalid responses retain the prompt', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...options: unknown[]) {
      return kind.startsWith('webgl') ? null : Reflect.apply(getContext, this, [kind, ...options]);
    } as typeof getContext;
  });
  let valid = true;
  await page.route('**/api/scene-plan', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ prompt: fictionalMarket, fictional: true });
    await route.fulfill({ json: valid ? plotResponse(fictionalMarket) : { scene: 'Invalid response' } });
  });
  await openPrompt(page, fictionalMarket);
  await page.getByRole('checkbox', { name: /Send this fictional prompt/ }).check();
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByText('Planned with Gemini')).toBeVisible();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await expect(page.locator('.static-note')).toContainText('the 3D world is unavailable');
  const moments = page.getByRole('region', { name: 'Memory moments' });
  await moments.getByRole('button', { name: 'Take in the view' }).click();
  await moments.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(moments.getByRole('heading', { name: 'Memory complete' })).toBeVisible();

  valid = false;
  await openPrompt(page, fictionalMarket);
  await page.getByRole('checkbox', { name: /Send this fictional prompt/ }).check();
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid plot');
  await expect(page.getByLabel('Describe the world')).toHaveValue(fictionalMarket);
  await expect(page.getByRole('button', { name: 'Enter world' })).toHaveCount(0);
});

test('a home run is one cinematic action and can be restarted after saving during the pitch', async ({ page }, info) => {
  test.setTimeout(95_000);
  await startPromptGame(page, homeRun);
  const canvas = page.locator('.walk-viewport canvas');
  await canvas.screenshot({ path: info.outputPath('diamond-approach.png') });
  await playMoment(page, 1, { wait: false });
  await expect(page.getByText('0 of 1 moments complete')).toBeVisible();
  await saveAndContinue(page);
  await expect(page.getByText('0 of 1 moments complete')).toBeVisible();
  await playMoment(page, 1, { wait: false });
  await page.waitForTimeout(1800);
  await canvas.screenshot({ path: info.outputPath('diamond-action.png') });
  await expect(page.getByText('1 of 1 moments complete')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('The ball is gone past the fence. Dad is still smiling.')).toBeVisible();
  await canvas.screenshot({ path: info.outputPath('diamond-ending.png') });
  await saveAndContinue(page);
  await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Replay visit' }).click();
  await expect(page.getByText('0 of 1 moments complete')).toBeVisible();
});

test('the same field supports a different action with an accessible timing alternative', async ({ page }, info) => {
  test.setTimeout(75_000);
  await startPromptGame(page, catchGame);
  await expect(page.getByRole('button', { name: 'Get ready to catch' })).toBeVisible();
  await playMoment(page, 1, { timing: true });
  await expect(page.getByText('You have the ball. There is still light for another throw.')).toBeVisible();
  await page.locator('.walk-viewport canvas').screenshot({ path: info.outputPath('catch-ending.png') });
});

test('a generated plot supports touch movement, orbit and action on a narrow screen', async ({ browser }, info) => {
  test.setTimeout(60_000);
  const page = await browser.newPage({ baseURL: info.project.use.baseURL, hasTouch: true, isMobile: true,
    viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await startPromptGame(page, 'park', directedScene);
    const pad = page.getByRole('button', { name: 'Walk forward' });
    await pad.scrollIntoViewIfNeeded();
    const bounds = (await pad.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    const position = await playerAt(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }] });
    await page.waitForTimeout(240);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect((await playerAt(page)).z).toBeLessThan(position.z);
    const canvas = page.locator('.walk-viewport canvas');
    const before = await canvas.screenshot();
    const box = (await canvas.boundingBox())!;
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, x: start.x + 65 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
    await page.getByRole('button', { name: 'Recenter camera' }).tap();
    const point = JSON.parse((await page.locator('.walk-viewport').getAttribute('data-moment-point'))!);
    await walkToGoal(page, { kind: 'ending', ready: true }, point);
    await page.getByRole('button', { name: 'Take in the view' }).tap();
    await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();
  } finally { await page.close(); }
});
