import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL,
    // Most specs check the windowed layout, where every panel is on the page. Full screen (the default
    // for players) has its own specs, which turn it back on with test.use({ storageState: ... }).
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: 'memory-worlds-settings', value: JSON.stringify({ volume: 0.8, reducedMotion: 'system', fullscreen: false }) }] }],
    },
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
  },
});
