import { z } from 'zod';

const KEY = 'memory-worlds-settings';

/** Interface atmospheres. "auto" follows the world being played; outside a world it is GENESIS. */
export const atmospheres = {
  genesis: { name: 'GENESIS', note: 'Night terminal: black and lime' },
  nebula: { name: 'Nebula', note: 'Violet dusk' },
  daylight: { name: 'Daylight', note: 'Light screen for bright rooms' },
  fog: { name: 'Fog', note: 'Grey-teal CRT for rain, fog and snow' },
} as const;
export type Atmosphere = keyof typeof atmospheres;
const atmosphereIds = Object.keys(atmospheres) as [Atmosphere, ...Atmosphere[]];

const settingsSchema = z.strictObject({
  volume: z.number().min(0).max(1),
  reducedMotion: z.enum(['system', 'on', 'off']),
  // Added later: defaults keep settings saved by earlier versions valid.
  theme: z.enum(['auto', ...atmosphereIds]).default('auto'),
  pixel: z.boolean().default(true),
});
export type Settings = z.infer<typeof settingsSchema>;
const defaults: Settings = { volume: 0.8, reducedMotion: 'system', theme: 'auto', pixel: true };
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
  applyAppearance();
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

let worldAtmosphere: Atmosphere | null = null;

/** The atmosphere a world suggests from its time of day and weather. */
export function atmosphereFor({ timeOfDay, weather }: { timeOfDay?: string | null; weather?: string | null }): Atmosphere {
  if (weather && ['fog', 'rain', 'snow'].includes(weather)) return 'fog';
  if (timeOfDay === 'night') return 'genesis';
  if (timeOfDay === 'dusk' || timeOfDay === 'dawn') return 'nebula';
  if (timeOfDay === 'day' || timeOfDay === 'morning') return 'daylight';
  return 'genesis';
}

/** Called by a running world; null when the player leaves it. */
export function setWorldAtmosphere(next: Atmosphere | null) {
  worldAtmosphere = next;
  applyAppearance();
}

export function effectiveAtmosphere(settings = readSettings()): Atmosphere {
  return settings.theme === 'auto' ? worldAtmosphere ?? 'genesis' : settings.theme;
}

/** Reflect theme, motion and pixel settings on <html> so CSS can follow them. */
export function applyAppearance() {
  const settings = readSettings();
  const root = document.documentElement;
  root.dataset.ui = effectiveAtmosphere(settings);
  root.dataset.motion = settings.reducedMotion === 'on' ? 'off' : settings.reducedMotion === 'off' ? 'on' : 'system';
  root.dataset.pixel = settings.pixel ? 'on' : 'off';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#070a07');
}
