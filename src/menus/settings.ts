import { z } from 'zod';

const KEY = 'memory-worlds-settings';
const settingsSchema = z.strictObject({
  volume: z.number().min(0).max(1),
  reducedMotion: z.enum(['system', 'on', 'off']),
});
export type Settings = z.infer<typeof settingsSchema>;
const defaults: Settings = { volume: 0.8, reducedMotion: 'system' };
const listeners = new Set<() => void>();

export function readSettings(): Settings {
  try {
    return settingsSchema.parse(JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? defaults);
  } catch {
    return defaults;
  }
}

export function writeSettings(settings: Settings) {
  localStorage.setItem(KEY, JSON.stringify(settingsSchema.parse(settings)));
  for (const listener of listeners) listener();
}

export function subscribeToSettings(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Apply the saved volume to every soundtrack or preview as it starts playing. */
export function installVolumeSetting() {
  document.addEventListener('play', (event) => {
    if (event.target instanceof HTMLMediaElement) event.target.volume = readSettings().volume;
  }, true);
}
