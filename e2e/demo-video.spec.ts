// Records the case demonstration video (≤3 min): entry, photo and song → memory and day folder → library.
// Opt-in: DEMO_VIDEO=1 PLAYWRIGHT_CHANNEL=chrome npx playwright test e2e/demo-video.spec.ts
// Writes submission-output/memory-worlds-demo.mp4 (needs FFmpeg on PATH).
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createCatalogSoundtrack } from '../src/media/world-soundtrack';
import { visitArtifact, visitEnding } from './walk';

test.skip(!process.env.DEMO_VIDEO, 'Set DEMO_VIDEO=1 to record the demonstration video.');
test.setTimeout(6 * 60_000);
test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

const output = path.resolve('submission-output');
const fps = 25;

async function startVideo(page: Page) {
  const session = await page.context().newCDPSession(page);
  const frames: Buffer[] = [];
  let last: Buffer | undefined;
  session.on('Page.screencastFrame', ({ data, sessionId }) => {
    last = Buffer.from(data, 'base64');
    void session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await session.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1280, maxHeight: 800 });
  const timer = setInterval(() => { if (last) frames.push(last); }, 1000 / fps);
  return {
    seconds: () => frames.length / fps,
    async render(song: string, songStart: number, file: string) {
      clearInterval(timer);
      await session.send('Page.stopScreencast').catch(() => {});
      expect(frames.length / fps).toBeLessThan(180);
      const args = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-f', 'image2pipe',
        '-vcodec', 'mjpeg', '-i', 'pipe:0', '-stream_loop', '-1', '-i', song,
        '-filter_complex', `[1:a]adelay=${Math.round(songStart * 1000)}:all=1,volume=0.8,afade=t=out:st=${Math.max(0, frames.length / fps - 2)}:d=2[a]`,
        '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', file];
      const encoder = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((resolve, reject) => encoder.once('exit', (code) => code === 0 ? resolve(code) : reject(new Error('ffmpeg ' + code))));
      for (const frame of frames) {
        if (!encoder.stdin.write(frame)) await new Promise((resolve) => encoder.stdin.once('drain', resolve));
      }
      encoder.stdin.end();
      await done;
    },
  };
}

async function caption(page: Page, step: string, detail: string) {
  await page.evaluate(({ step, detail }) => {
    document.querySelector('#demo-caption')?.remove();
    const card = document.createElement('aside');
    card.id = 'demo-caption';
    card.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:760px;padding:12px 18px;'
      + 'background:rgba(8,12,8,.92);color:#e8f5d0;border:2px solid #9be15d;box-shadow:4px 4px 0 #5b2bd6;z-index:2147483647;'
      + 'font:15px/1.45 "JetBrains Mono Variable",ui-monospace,monospace;pointer-events:none;text-align:center';
    const title = document.createElement('div');
    title.textContent = step;
    title.style.cssText = 'color:#9be15d;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:13px;margin-bottom:3px';
    const text = document.createElement('div');
    text.textContent = detail;
    card.append(title, text);
    document.body.append(card);
  }, { step, detail });
}

test('record the demonstration video', async ({ page }) => {
  await mkdir(output, { recursive: true });
  // The first fictional example day (src/fixtures/memories.ts), entered through the real form.
  const day = { slug: 'nostalgic-park', date: '2026-10-04',
    entryText: 'The last light in the park held on after the paths emptied. I took the long way around the bench before going home.' };
  const photo = path.join(output, day.slug + '.png');
  const song = path.join(output, 'coastal-light.wav');
  await writeFile(photo, await readFile(path.join('src', 'fixtures', 'media', day.slug + '.png')));
  await writeFile(song, new Uint8Array(await createCatalogSoundtrack('coastal-light').blob!.arrayBuffer()));
  const pause = (ms: number) => page.waitForTimeout(ms);

  await page.goto('/');
  await page.getByRole('link', { name: 'New Game', exact: true }).waitFor();
  const video = await startVideo(page);
  await caption(page, 'Memory Worlds', 'Write what happened, add a photo and the song of the day. The day becomes a small world you can walk through.');
  await pause(4000);

  await page.getByRole('link', { name: 'New Game', exact: true }).click();
  await pause(1200);
  await page.getByRole('link', { name: /Create a day memory/ }).click();
  await caption(page, '1 · Entry, photo and song', 'A fictional demo day: an original illustration and an original song. Everything stays in this browser.');
  await page.getByLabel('Date', { exact: true }).fill(day.date);
  await page.getByLabel('What happened that day?').pressSequentially(day.entryText, { delay: 18 });
  await page.getByLabel('Photos', { exact: true }).setInputFiles(photo);
  await page.getByLabel('Audio excerpt', { exact: true }).setInputFiles(song);
  await page.getByRole('checkbox').check();
  await pause(1500);
  await page.getByRole('button', { name: 'Validate draft' }).click();
  await page.getByRole('button', { name: 'Generate memory' }).click();
  await expect(page.getByText('Memory preview ready.', { exact: true })).toBeVisible();
  const title = (await page.locator('.generated-memory h2').first().textContent())!.trim();

  await caption(page, '2 · The memory is built from the input', `Title and folder: "${title}". The words pick the scene and mood, the photo sets the palette, the song sets the motion.`);
  const why = page.getByText('Why this scene?');
  await why.scrollIntoViewIfNeeded();
  await why.click();
  await pause(4500);

  await page.getByRole('button', { name: 'Play soundtrack' }).click();
  const audio = page.locator('audio');
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime)).toBeGreaterThan(0.05);
  const songStart = Math.max(0, video.seconds() - await audio.evaluate((node: HTMLAudioElement) => node.currentTime));
  await page.locator('.walk-viewport').scrollIntoViewIfNeeded();
  await caption(page, '3 · Walk and reveal', 'Walk to the two marked objects. Each one opens the original photo or the exact words from the entry.');
  await pause(3500);
  await visitArtifact(page, 0);
  await pause(2200);
  await visitArtifact(page, 1);
  await pause(2200);
  await caption(page, '3 · The ending', 'With both found, the closing landmark ends the visit.');
  await visitEnding(page);
  await page.getByRole('heading', { name: 'Memory complete' }).first().scrollIntoViewIfNeeded();
  await pause(4500);

  await caption(page, '4 · The day folder', `Save to the archive, or export the folder "${title}" as a ZIP with the original photo, song and scene.`);
  const save = page.getByRole('button', { name: /Save to archive/ });
  await save.scrollIntoViewIfNeeded();
  if (await save.isEnabled()) await save.click();
  await page.getByRole('button', { name: 'Export ZIP' }).scrollIntoViewIfNeeded();
  await pause(3500);

  console.log('library at', video.seconds());
  await page.goto('/library');
  await caption(page, '5 · Browse the archive', 'Your saved days sit next to five example days with different moods: each folder name came from the engine.');
  const shelf = page.getByRole('list', { name: 'Memories' });
  await pause(4500);
  await shelf.getByRole('link', { name: /The city by the river/ }).click();
  await caption(page, 'Same system, different day', 'A calm night city: new words, light and music give the same visual system a different mood.');
  await pause(5000);
  await page.goto('/library');
  await shelf.getByRole('link', { name: new RegExp('^Day ' + title) }).click();
  await caption(page, '6 · Reopen the saved day', 'The memory opens again from the archive, with its photo, words and song.');
  await pause(5000);

  console.log('video seconds', video.seconds());
  await video.render(song, songStart, path.join(output, 'memory-worlds-demo.mp4'));
});
