import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;
const production = process.env.PLAYWRIGHT_PRODUCTION === '1';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL,
    storageState: { cookies: [], origins: [{ origin: baseURL, localStorage: [{
      name: 'memory-worlds-settings', value: JSON.stringify({ volume: 0.8, reducedMotion: 'system', fullscreen: false }),
    }] }] },
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: production ? `npm exec -- vite preview --host 127.0.0.1 --port ${port} --strictPort`
      : `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
  },
});
