// Records the case demonstration video (≤3 min): entry, photo and song → memory and day folder → library.
// Opt-in: DEMO_VIDEO=1 PLAYWRIGHT_CHANNEL=chrome npx playwright test e2e/demo-video.spec.ts
// Writes submission-output/memory-worlds-demo.mp4 (needs FFmpeg on PATH). DEMO_LANG=ru records the Russian
// version (interface, entry and captions) to submission-output/memory-worlds-demo-ru.mp4.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createCatalogSoundtrack } from '../src/media/world-soundtrack';
import { translate } from '../src/i18n/i18n';
import { visitArtifact, visitEnding } from './walk';

test.skip(!process.env.DEMO_VIDEO, 'Set DEMO_VIDEO=1 to record the demonstration video.');
test.setTimeout(6 * 60_000);
// Players' defaults: the world opens in full screen and its soundtrack starts by itself.
test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] } });

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

const ru = process.env.DEMO_LANG === 'ru';
const L = (text: string) => translate(ru ? 'ru' : 'en', text);
const say = {
  intro: ru ? ['Memory Worlds', 'Напишите, что произошло, добавьте фото и песню дня. День станет маленьким миром, по которому можно пройтись.']
    : ['Memory Worlds', 'Write what happened, add a photo and the song of the day. The day becomes a small world you can walk through.'],
  input: ru ? ['1 · Запись, фото и песня', 'Вымышленный день: оригинальная иллюстрация и оригинальная песня. Всё остаётся в этом браузере.']
    : ['1 · Entry, photo and song', 'A fictional demo day: an original illustration and an original song. Everything stays in this browser.'],
  built: (title: string) => ru ? ['2 · Воспоминание собрано из ваших данных', `Название и папка: «${title}». Слова выбирают место и настроение, фото задаёт палитру, песня — движение.`]
    : ['2 · The memory is built from the input', `Title and folder: "${title}". The words pick the scene and mood, the photo sets the palette, the song sets the motion.`],
  walk: ru ? ['3 · Прогулка и находки', 'Дойдите до двух отмеченных предметов. Каждый открывает оригинальное фото или точные слова из записи.']
    : ['3 · Walk and reveal', 'Walk to the two marked objects. Each one opens the original photo or the exact words from the entry.'],
  ending: ru ? ['3 · Финал', 'Когда оба найдены, последний ориентир завершает прогулку.'] : ['3 · The ending', 'With both found, the closing landmark ends the visit.'],
  folder: (title: string) => ru ? ['4 · Папка дня', `Сохраните прогулку: папка «${title}» хранит оригинальное фото, песню и сцену (и выгружается в ZIP).`]
    : ['4 · The day folder', `Save the finished visit: the day folder "${title}" keeps the original photo, song and scene (and exports as a ZIP).`],
  library: ru ? ['5 · Архив', 'Сохранённые дни лежат рядом с пятью примерами с разным настроением: каждое название придумал движок.']
    : ['5 · Browse the archive', 'Your saved days sit next to five example days with different moods: each folder name came from the engine.'],
  contrast: ru ? ['Та же система, другой день', 'Спокойный ночной город: другие слова, свет и музыка дают той же визуальной системе другое настроение.']
    : ['Same system, different day', 'A calm night city: new words, light and music give the same visual system a different mood.'],
  reopen: ru ? ['6 · Снова открыть день', 'Воспоминание открывается из архива — с фото, словами и песней.']
    : ['6 · Reopen the saved day', 'The memory opens again from the archive, with its photo, words and song.'],
  words: ru ? ['7 · Или начните с пары слов', 'Описание превращается в место прямо на устройстве: здесь — ночная рыночная улица.']
    : ['7 · Or start from a few words', 'A description becomes a place on this device: here, a night market street.'],
};
// The first fictional example day (src/fixtures/memories.ts), entered through the real form.
const day = { slug: 'nostalgic-park', date: '2026-10-04', entryText: ru
  ? 'Тихий вечер в парке над рекой. Я вспомнил старую скамейку и пошёл домой длинной дорогой.'
  : 'The last light in the park held on after the paths emptied. I took the long way around the bench before going home.' };
const scenePrompt = ru ? 'Ночной рынок на улице: шесть прилавков, четыре фонаря и две скамейки.'
  : 'A night market street with six stalls, four lanterns and two benches.';

test('record the demonstration video', async ({ page }) => {
  await mkdir(output, { recursive: true });
  if (ru) await page.addInitScript(() => {
    const key = 'memory-worlds-settings';
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!saved || saved.lang !== 'ru') localStorage.setItem(key, JSON.stringify({ volume: 0.8, reducedMotion: 'system', theme: 'auto', pixel: false,
      lang: 'ru', autoplay: true, fullscreen: true, view: 'first', ink: true, sensitivity: 1, fov: 68, inkWeight: 'medium', textScale: 100 }));
  });
  const photo = path.join(output, day.slug + '.png');
  const song = path.join(output, 'coastal-light.wav');
  await writeFile(photo, await readFile(path.join('src', 'fixtures', 'media', day.slug + '.png')));
  await writeFile(song, new Uint8Array(await createCatalogSoundtrack('coastal-light').blob!.arrayBuffer()));
  const pause = (ms: number) => page.waitForTimeout(ms);
  const show = ([step, detail]: string[]) => caption(page, step, detail);

  await page.goto('/');
  await page.locator('.title-menu, main').first().waitFor();
  const video = await startVideo(page);
  await show(say.intro);
  await pause(4000);

  await page.goto('/new');
  await pause(1200);
  await page.getByRole('link', { name: new RegExp(L('Create a day memory')) }).click();
  await show(say.input);
  await page.getByLabel(L('Date'), { exact: true }).fill(day.date);
  await page.getByLabel(L('What happened that day?')).pressSequentially(day.entryText, { delay: 18 });
  await page.getByLabel(L('Photos'), { exact: true }).setInputFiles(photo);
  await page.getByLabel(L('Audio excerpt'), { exact: true }).setInputFiles(song);
  await page.getByRole('checkbox').check();
  await pause(1500);
  await page.getByRole('button', { name: L('Validate draft') }).click();
  await page.getByRole('button', { name: L('Generate memory') }).click();
  await expect(page.getByText(L('Memory preview ready.'), { exact: true })).toBeVisible();
  const title = (await page.locator('.generated-memory h2').first().textContent())!.trim();

  await show(say.built(title));
  if (!ru) {
    const why = page.getByText('Why this scene?');
    await why.scrollIntoViewIfNeeded();
    await why.click();
  }
  await pause(4500);

  await page.getByRole('button', { name: L('Enter world') }).click();
  await expect(page.locator('.warp')).toHaveCount(0, { timeout: 15_000 });
  const audio = page.locator('audio').first();
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime)).toBeGreaterThan(0.05);
  const songStart = Math.max(0, video.seconds() - await audio.evaluate((node: HTMLAudioElement) => node.currentTime));
  await show(say.walk);
  await pause(3500);
  await visitArtifact(page, 0);
  await pause(2200);
  await visitArtifact(page, 1);
  await pause(2200);
  await show(say.ending);
  await visitEnding(page);
  await pause(3500);

  await show(say.folder(title));
  await page.getByRole('button', { name: L('Save to library') }).click();
  await expect(page.getByText(L('Saved to your library.'))).toBeVisible();
  await pause(3000);
  await page.getByRole('button', { name: L('Open library') }).click();

  await show(say.library);
  const shelf = page.getByRole('list', { name: L('Memories') });
  await pause(4500);
  await shelf.getByRole('link', { name: new RegExp(L('The city by the river')) }).click();
  await page.getByRole('button', { name: L('Enter world') }).click();
  await expect(page.locator('.warp')).toHaveCount(0, { timeout: 15_000 });
  await show(say.contrast);
  await pause(6500);
  await page.goto('/library');
  await shelf.getByRole('link', { name: new RegExp('^' + L('Day') + ' ' + title) }).click();
  await show(say.reopen);
  await pause(5000);

  await page.goto('/new/prompt');
  await show(say.words);
  await page.getByLabel(L('Describe the world')).pressSequentially(scenePrompt, { delay: 14 });
  await page.getByRole('button', { name: L('Build world') }).click();
  await page.getByRole('button', { name: L('Enter world') }).click();
  await expect(page.locator('.warp')).toHaveCount(0, { timeout: 15_000 });
  await page.keyboard.down('w');
  await pause(2600);
  await page.keyboard.up('w');
  await pause(2500);

  console.log('video seconds', video.seconds());
  await video.render(song, songStart, path.join(output, ru ? 'memory-worlds-demo-ru.mp4' : 'memory-worlds-demo.mp4'));
});
