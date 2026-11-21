import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { createServer, preview } from 'vite';
import { unzipSync } from 'fflate';

const output = path.resolve('submission-output');
const results = path.join(output, 'day-results');
const inputs = path.join(output, 'fictional-inputs');
const clips = path.join(output, 'captures');
const channel = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
const port = Number(process.env.MEMORY_CASE_PORT ?? '4321');

for (const directory of [output, results, inputs, clips]) await mkdir(directory, { recursive: true });
const source = await createServer({ configFile: false, server: { middlewareMode: true, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] } });
const { fixtures } = await source.ssrLoadModule('/src/fixtures/memories.ts');
const { createCatalogSoundtrack } = await source.ssrLoadModule('/src/media/world-soundtrack.ts');
const { routeTo } = await source.ssrLoadModule('/src/world/route.ts');
const { targetAt } = await source.ssrLoadModule('/src/gameplay/controller.ts');
const shipped = await preview({ configFile: false, preview: { host: '127.0.0.1', port, strictPort: true } });
const baseURL = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ channel });
const context = await browser.newContext({ baseURL, viewport: { width: 1120, height: 780 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await context.newPage();
const network = new Set();
const pageErrors = [];
page.on('request', request => {
  const url = request.url();
  if (url.startsWith('http') && !url.startsWith(baseURL + '/')) network.add(url);
});
page.on('pageerror', error => pageErrors.push(error.message));

function processExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve(undefined) : reject(new Error(`Process exited with code ${code}`)));
  });
}

async function startVideo() {
  const session = await context.newCDPSession(page);
  const fps = 15;
  const frames = [];
  let last;
  session.on('Page.screencastFrame', ({ data, sessionId }) => {
    last = Buffer.from(data, 'base64');
    void session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await session.send('Page.startScreencast', { format: 'jpeg', quality: 77, maxWidth: 1120, maxHeight: 780, everyNthFrame: 1 });
  const timer = setInterval(() => { if (last) frames.push(last); }, 1000 / fps);
  let stopped = false;
  async function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    await session.send('Page.stopScreencast').catch(() => {});
  }
  return {
    time: () => (frames.length / fps),
    stop,
    async render(segments) {
      await stop();
      assert.ok(frames.length > 0 && frames.length / fps < 180, 'Expected captured footage under three minutes');
      const args = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-f', 'image2pipe', '-vcodec', 'mjpeg', '-i', 'pipe:0'];
      for (const segment of segments) args.push('-i', segment.file);
      const filters = segments.map((segment, i) => {
        const delay = Math.round(segment.start * 1000);
        return `[${i + 1}:a]atrim=duration=${segment.seconds},volume=0.75,adelay=${delay}:all=1[a${i}]`;
      });
      const mixes = segments.map((_, i) => `[a${i}]`).join('');
      args.push('-filter_complex', filters.join(';') + `;${mixes}amix=inputs=${segments.length}:duration=longest:normalize=0,apad[demo]`,
        '-map', '0:v', '-map', '[demo]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', path.join(output, 'memory-worlds-demo.mp4'));
      const encoder = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true });
      const done = processExit(encoder);
      encoder.stdin.on('error', () => {});
      for (const frame of frames) {
        if (!encoder.stdin.write(frame)) {
          await Promise.race([new Promise(resolve => encoder.stdin.once('drain', resolve)), done]);
        }
      }
      encoder.stdin.end();
      await done;
    },
  };
}

async function caption(heading, detail) {
  await page.evaluate(({ heading, detail }) => {
    document.querySelector('#case-caption')?.remove();
    const card = document.createElement('aside');
    card.id = 'case-caption';
    card.style.cssText = 'position:fixed;right:15px;top:15px;width:230px;padding:12px;background:#151d1a;color:#fcebd3;border:1px solid #a89470;border-radius:8px;z-index:40;font:14px/1.38 system-ui;pointer-events:none';
    const title = document.createElement('strong');
    title.textContent = heading;
    const text = document.createElement('div');
    text.textContent = detail;
    text.style.marginTop = '4px';
    card.append(title, text);
    document.body.append(card);
  }, { heading, detail });
}

const duration = ms => new Promise(resolve => setTimeout(resolve, ms));
async function playerAt(stage) {
  const value = await stage.getAttribute('data-player');
  const [x, z] = value.split(',').map(Number);
  return { x, z };
}

async function walk(stage, goal, found) {
  const runtime = JSON.parse(await stage.getAttribute('data-walk-targets'));
  const matches = at => {
    const target = targetAt(at, runtime, found.filter(Boolean).length, found);
    return target?.kind === goal.kind && (goal.kind === 'ending' ? target.ready : target.index === goal.index);
  };
  await stage.scrollIntoViewIfNeeded();
  for (const clearance of [0.13, .07, 0, 0]) {
    if (matches(await playerAt(stage))) return;
    const waypoints = routeTo({ ...runtime, playerRadius: runtime.playerRadius + clearance }, goal, await playerAt(stage));
    if (!waypoints) continue;
    for (const waypoint of waypoints.slice(1)) {
      for (let attempt = 0; attempt < 22; attempt++) {
        const position = await playerAt(stage);
        if (matches(position)) return;
        const dx = waypoint.x - position.x, dz = waypoint.z - position.z;
        if (Math.hypot(dx, dz) < .13) break;
        const horizontal = Math.abs(dx) > Math.abs(dz);
        const key = horizontal ? dx > 0 ? 'ArrowRight' : 'ArrowLeft' : dz > 0 ? 'ArrowDown' : 'ArrowUp';
        await page.keyboard.down(key);
        await duration(Math.min(215, Math.max(36, 235 * Math.abs(horizontal ? dx : dz))));
        await page.keyboard.up(key);
      }
    }
  }
  throw new Error('Could not reach the demonstrated target: ' + JSON.stringify(goal));
}

const trackIds = ['coastal-light', 'still-rooms', 'coastal-light', 'lantern-market', 'still-rooms'];
const records = [];
const segments = [];
let video;
try {
  await page.goto('/');
  assert.equal(await page.getByRole('heading', { name: 'Memory Worlds' }).count(), 1);
  for (const [index, fixture] of fixtures.entries()) {
    const photo = path.join(inputs, fixture.slug + '.png');
    const song = path.join(inputs, trackIds[index] + '.wav');
    const soundtrack = createCatalogSoundtrack(trackIds[index]);
    await writeFile(photo, await readFile(path.join('src', 'fixtures', 'media', fixture.slug + '.png')));
    await writeFile(song, new Uint8Array(await soundtrack.blob.arrayBuffer()));
    await page.goto('/create');
    if (!index) {
      await caption('Memory Worlds', 'Fictional demo day with an original illustration and an original synthesized song.');
      video = await startVideo();
      await duration(1700);
    }
    await page.getByLabel('Date', { exact: true }).fill(fixture.date);
    await page.getByLabel('What happened that day?').fill(fixture.entryText);
    await page.getByLabel('Photos', { exact: true }).setInputFiles(photo);
    await page.getByLabel('Audio excerpt').setInputFiles(song);
    await page.getByLabel(/I own or have permission/).check();
    if (!index) {
      await caption('1 · Describe the day', 'The entry, illustration and associated song stay in this browser.');
      await duration(1900);
    }
    await page.getByRole('button', { name: 'Validate draft' }).click();
    await page.getByRole('button', { name: 'Generate memory' }).click();
    const memory = page.locator('.generated-memory');
    const title = await memory.locator('h2').innerText();
    await memory.getByText('Why this scene?').click();
    if (!index) {
      await caption('2 · Build the memory', 'The entry supplies the scene cues and title. The image supplies the palette and brightness.');
      await duration(2200);
      const soundtrackButton = memory.getByRole('button', { name: 'Play soundtrack' });
      await soundtrackButton.click();
      const audio = memory.locator('audio');
      await page.waitForFunction(() => document.querySelector('audio')?.currentTime > .08);
      const sample = await audio.evaluate(node => ({ time: node.currentTime, seconds: node.duration }));
      segments.push({ start: Math.max(0, video.time() - sample.time), file: song, seconds: sample.seconds });
      const stage = memory.locator('.walk-viewport');
      await stage.waitFor({ state: 'visible' });
      await page.waitForFunction(() => Boolean(document.querySelector('.walk-viewport')?.getAttribute('data-player')));
      await caption('3 · Walk and reveal', 'Follow the path to the two objects. The original image and an exact journal excerpt are in the reveal cards.');
      for (const n of [0, 1]) {
        await walk(stage, { kind: 'artifact', index: n }, [n > 0, false]);
        await page.keyboard.press('e');
        await memory.getByText(`${n + 1} of 2 artifacts revealed`).waitFor();
        await memory.locator('.artifact-card').nth(n).scrollIntoViewIfNeeded();
        await duration(1400);
      }
      await walk(stage, { kind: 'ending', ready: true }, [true, true]);
      await page.keyboard.press('e');
      await memory.getByRole('heading', { name: 'Memory complete' }).scrollIntoViewIfNeeded();
      await duration(1400);
    }
    await memory.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Save Game' }).click();
    await page.getByRole('dialog').getByText('Game saved in this browser.').waitFor();
    await page.getByRole('button', { name: 'Resume' }).click();
    if (!index) await caption('4 · Save and export', 'The local archive remembers this visit. The ZIP carries original files and the resolved scene.');
    const [download] = await Promise.all([page.waitForEvent('download'), memory.getByRole('button', { name: 'Export ZIP' }).click()]);
    const zip = path.join(results, download.suggestedFilename());
    await download.saveAs(zip);
    const members = unzipSync(new Uint8Array(await readFile(zip)));
    const credits = JSON.parse(new TextDecoder().decode(members[title + '/credits.json']));
    assert.equal(credits.photos[0].filename, fixture.slug + '.png');
    assert.equal(credits.audio.filename, trackIds[index] + '.wav');
    assert.deepEqual(Buffer.from(members[`${title}/photos/${credits.photos[0].id}.png`]), await readFile(photo));
    assert.deepEqual(Buffer.from(members[`${title}/audio/${credits.audio.id}.wav`]), await readFile(song));
    const archive = page.getByRole('link', { name: 'Archive', exact: true });
    await archive.click();
    await page.getByRole('heading', { name: 'Archive', exact: true }).waitFor();
    const entry = page.getByRole('list', { name: 'Saved memories' }).getByRole('link', { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    const href = await entry.getAttribute('href');
    records.push({ title, date: fixture.date, file: download.suggestedFilename(), href, source: fixture.slug, soundtrack: trackIds[index] });
    if (index === 1 || index === 2) {
      await entry.click();
      await caption('Contrast · ' + title, 'The new source cues change the light, scenery, and the track associated with the day.');
      await page.locator('.memory-stage').scrollIntoViewIfNeeded();
      await duration(1900);
    }
  }
  await caption('5 · Browse five fictional days', 'Every title came from the engine. Each card reopens its own scene and original files.');
  await page.getByRole('list', { name: 'Saved memories' }).screenshot({ path: path.join(output, 'five-day-contact-sheet.png') });
  await duration(2600);
  await page.goto(records[0].href);
  await page.getByRole('heading', { name: 'Memory complete' }).waitFor();
  await caption('6 · Reopen the saved day', 'The saved visit is complete. The same illustration and song are available again.');
  await page.locator('.photo-gallery img').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(clips, 'reopened-day.png') });
  await duration(2800);
  await video.render(segments);
  const clean = await browser.newContext({ baseURL });
  try {
    const fresh = await clean.newPage();
    await fresh.goto('/archive');
    for (const record of records) {
      await fresh.getByLabel('Memory ZIP').setInputFiles(path.join(results, record.file));
      await fresh.getByRole('button', { name: 'Import ZIP' }).click();
      await fresh.getByRole('link', { name: 'Open imported memory' }).waitFor();
    }
    await fresh.getByRole('link', { name: 'Open imported memory' }).click();
    await fresh.getByText('0 of 2 artifacts revealed').waitFor();
    await fresh.goto('/examples/rainy-kitchen');
    await fresh.getByRole('heading', { name: 'Rain beyond the kitchen window' }).waitFor();
  } finally { await clean.close(); }
  assert.deepEqual([...network], []);
  assert.deepEqual(pageErrors, []);
  await writeFile(path.join(output, 'verified-results.json'), JSON.stringify({ baseURL, browser: browser.version(), records,
    originalsByteExact: true, importedInFreshProfile: records.length, externalRequests: 0 }, null, 2));
  console.log(`Packaged and verified ${records.length} generated days in ${output}`);
} finally {
  await video?.stop();
  await browser.close();
  await shipped.close();
  await source.close();
}
