import { expect, test } from '@playwright/test';
import { plotResponse } from './support/plot-fixtures';
import { startPromptGame } from './world-walk';
import { playMoment } from './walk';

for (const [prompt, required, narrow] of [
  ['park', ['Gazebo', 'Bench', 'Flower bed', 'Pine'], false],
  ['water park', ['Pool basin', 'Tube slide', 'Splash pad', 'Lifeguard chair'], true],
] as const) {
  test(`AT-29: builds, walks, and captures ${prompt}`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: narrow ? 390 : 1200, height: narrow ? 844 : 940 });
    if (narrow) await page.emulateMedia({ reducedMotion: 'reduce' });
    await startPromptGame(page, prompt);
    const stage = page.getByRole('region', { name: 'Prompt world' });
    const canvas = stage.locator('canvas');
    await expect(canvas).toBeVisible();
    await canvas.screenshot({ path: info.outputPath('01-spawn.png'), timeout: 20_000 });
    await playMoment(page, 1);
    await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();
    await canvas.screenshot({ path: info.outputPath('04-ending.png'), timeout: 20_000 });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Save & Quit' }).click();
    await page.getByRole('link', { name: /Continue/ }).click();
    await expect(page.getByRole('heading', { name: 'Memory complete' })).toBeVisible();
    await page.getByText('How this world was built').click();
    for (const name of required) await expect(page.getByRole('region', { name: 'How the prompt was built' })).toContainText(name);
  });
}

test('AT-27: private building avoids the gateway and Gemini quota failures preserve the draft', async ({ page }) => {
  const plan = plotResponse('water park')!;
  let status = 200;
  let requests = 0;
  await page.route('**/api/scene-plan', async route => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({ prompt: 'water park', fictional: true });
    await route.fulfill({ status, json: status === 200 ? plan : { error: 'Quota' } });
  });
  await page.goto('/new/prompt');
  const description = page.getByLabel('Describe the world');
  await page.getByRole('button', { name: 'water park', exact: true }).click();
  const consent = page.getByLabel(/Send this fictional prompt/);
  await consent.check();
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByText('Planned with Gemini')).toBeVisible();
  await expect(page.getByText(/In the scene.*Pool basin/)).toBeVisible();
  await page.getByRole('button', { name: 'Build privately' }).click();
  await expect(page.getByText('Built privately')).toBeVisible();
  expect(requests).toBe(1);
  status = 429;
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByRole('alert')).toContainText('quota');
  await expect(page.getByRole('button', { name: 'Enter world' })).toHaveCount(0);
  await expect(description).toHaveValue('water park');
  status = 200;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Planned with Gemini')).toBeVisible();
  expect(requests).toBe(3);
});

test('edits cancel late plans and the main navigation confirms unsaved exits', async ({ page }) => {
  let respond: () => void = () => {};
  const responseGate = new Promise<void>(resolve => { respond = resolve; });
  await page.route('**/api/scene-plan', async route => {
    await responseGate;
    const { prompt } = route.request().postDataJSON() as { prompt: string };
    await route.fulfill({ json: plotResponse(prompt) }).catch(() => {});
  });
  await page.goto('/new/prompt');
  const field = page.getByLabel('Describe the world');
  await field.fill('park');
  await page.getByLabel(/Send this fictional prompt/).check();
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByRole('status')).toHaveText(/Writing the plot/);
  await field.fill('water park');
  respond();
  await expect(page.getByRole('button', { name: 'Enter world' })).toHaveCount(0);
  await page.getByLabel(/Send this fictional prompt/).check();
  await page.getByRole('button', { name: 'Build world' }).click();
  await expect(page.getByText('Planned with Gemini')).toBeVisible();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.getByRole('link', { name: 'Archive', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toBeVisible();
  await page.getByRole('button', { name: 'Save and leave' }).click();
  await expect(page).toHaveURL(/\/archive$/);
});

test('five fictional jury examples have thumbnails and refreshable links', async ({ page }, info) => {
  await page.goto('/examples');
  const collection = page.getByRole('navigation', { name: 'Test memories' });
  await expect(collection.getByRole('button')).toHaveCount(5);
  await collection.screenshot({ path: info.outputPath('diary-contact-sheet.png') });
  await page.goto('/examples/rainy-kitchen');
  await expect(page.getByRole('heading', { name: 'Rain beyond the kitchen window' })).toBeVisible();
});
