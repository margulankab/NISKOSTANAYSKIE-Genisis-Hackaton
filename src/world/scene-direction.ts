import { z } from 'zod';
import { Color, SRGBColorSpace } from 'three';
import { catalogTrackIds } from '../media/soundtrack-catalog';
import type { CatalogTrackId } from '../media/soundtrack-catalog';

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const reason = z.string().trim().min(3).max(140);
export const sceneBeds = ['quiet', 'breeze', 'rain', 'birds', 'station', 'room', 'crowd', 'waterfront', 'pool'] as const;
// Silence, or any track in the game's own score (the catalog lists 15 with their tags).
export const sceneTracks = ['silence', ...catalogTrackIds] as ['silence', ...CatalogTrackId[]];
export const sceneDirectionSchema = z.strictObject({
  version: z.literal(1),
  palette: z.strictObject({ horizon: color, sky: color, light: color, surface: color, accent: color }),
  bed: z.enum(sceneBeds),
  track: z.enum(sceneTracks),
  mix: z.enum(['hushed', 'balanced', 'lively']),
  reasons: z.strictObject({ palette: reason, time: reason, weather: reason, audio: reason }),
});
export type SceneDirection = z.infer<typeof sceneDirectionSchema>;

const surfaces: Record<string, string> = {
  park: '#667953', woodland: '#5c714e', rural: '#817b59', ballfield: '#637a4d', coast: '#9a8d73',
  city: '#888579', market: '#928578', interior: '#8e7460', station: '#7c7d82', 'water-park': '#c2b39b', fantasy: '#7a7273',
};

export function resolveScenePalette(palette: SceneDirection['palette'], setting: string) {
  const blend = new Color(palette.surface).lerp(new Color(surfaces[setting] ?? '#807b6d'), setting === 'water-park' ? .82 : .51);
  const keep = (paint: Color, maxSaturation: number, minLight: number, maxLight: number) => {
    const { h, s, l } = paint.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
    paint.setHSL(h, Math.min(s, maxSaturation), Math.min(maxLight, Math.max(l, minLight)), SRGBColorSpace);
    return '#' + paint.getHexString(SRGBColorSpace);
  };
  return {
    horizon: keep(new Color(palette.horizon), .65, .24, .8),
    sky: keep(new Color(palette.sky), .61, .15, .82),
    light: keep(new Color(palette.light), .66, .62, .91),
    surface: keep(blend, .43, .25, .74),
    accent: keep(new Color(palette.accent), .75, .27, .87),
  };
}

export function explicitSceneWeather(prompt: string) {
  // Past or negated weather is context for the scene, not its current conditions.
  const current = prompt.replace(/\b(?:after|without|no)\s+(?:(?:the|any|heavy|light)\s+)?(?:rain(?:storm)?|snow|fog|mist)\b/gi, '');
  if (/\b(?:snowy|snow(?:ing|fall)?|blizzard)\b/i.test(current)) return 'snow';
  if (/\b(?:rain(?:y|ing)?|drizzl(?:e|ing)|stormy|downpour)\b/i.test(current)) return 'rain';
  if (/\b(?:fog(?:gy)?|mist(?:y)?)\b/i.test(current)) return 'fog';
  if (/\b(?:clear sk(?:y|ies)|sunny|cloudless|no (?:rain|snow|fog))\b/i.test(prompt)) return 'clear';
}

export function explicitSceneTime(prompt: string) {
  if (/\b(?:sunset|dusk|twilight|evening)\b/i.test(prompt)) return 'dusk';
  if (/\b(?:sunrise|dawn|early morning)\b/i.test(prompt)) return 'dawn';
  if (/\b(?:night|midnight|moonlit|after dark)\b/i.test(prompt)) return 'night';
  if (/\b(?:midday|noon|afternoon|daylight|morning)\b/i.test(prompt)) return 'day';
}

export const waterfrontWords = /\b(?:embankment|waterfront|riverbank|riverside|seafront|lakeside)\b/i;
export const atHomeFeeling = /\b(?:felt|feel|feeling) (?:right )?at home\b/i;

export function sourceStaging(prompt: string) {
  const riding = /\b(?:slide|waterslide|flume)\b/i.test(prompt) && /\b(?:aquapark|water\s?park|water ?slide|flume)\b/i.test(prompt)
    && /\b(?:tried|rode|went down|slid|sliding|took the plunge)\b/i.test(prompt)
    && !/\b(?:never|did not|didn['’]t)\b/i.test(prompt);
  return {
    gathering: /\b(?:party|reception|gathering)\b/i.test(prompt) && /\b(?:many people|crowd\w*|guests|everyone|packed)\b/i.test(prompt),
    conversation: /\b(?:dialogue|conversation|chatted|talked|spoke)\b/i.test(prompt),
    laughter: /\b(?:laughed|laughing|laughter|giggled)\b/i.test(prompt),
    mourning: /\b(?:funerals?|memorial service|mourning|grieving)\b/i.test(prompt),
    dogComfort: /\bdog\b/i.test(prompt) && /\b(?:came to me|came over|comfort\w*|felt better|sat (?:with|beside) me|nuzzl\w*)\b/i.test(prompt),
    sipping: /\b(?:sip\w*|drank|drinking)\b/i.test(prompt) && /\b(?:coffee|tea|cocoa|drink)\b/i.test(prompt),
    waterfront: waterfrontWords.test(prompt),
    riding,
    ridingTogether: riding && /\bwe\s+(?:tried|rode|went down|slid|took)\b/i.test(prompt),
  };
}
