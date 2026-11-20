// Local, deterministic mood interpretation. NO AI model is involved: simple
// keyword scoring over the player's own words, then a hand-made preset.
import { MOOD_ORDER, PRESETS } from './presets';
import type { Fragment, MoodConfig, MoodId, PropKind } from './types';

const STOP = new Set('about after again also because been before being could every from have just like made make more much only other over really some than that their them then there these they this today very want was were what when which while with would yesterday still into your this have had and the for but not are you our out got get did went day'.split(' '));

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const words = (t: string) => t.toLowerCase().match(/[\p{L}']+/gu) ?? [];

export function scoreMoods(text: string): Record<MoodId, number> {
  const ws = words(text);
  const out = {} as Record<MoodId, number>;
  for (const id of MOOD_ORDER) {
    out[id] = ws.reduce((n, w) => n + (PRESETS[id].keywords.some((k) => (k.length <= 4 ? w === k : w.startsWith(k))) ? 1 : 0), 0);
  }
  return out;
}

export function pickMood(text: string, seed: number): MoodId {
  const s = scoreMoods(text);
  const best = Math.max(...MOOD_ORDER.map((m) => s[m]));
  if (best === 0) return MOOD_ORDER[seed % MOOD_ORDER.length]; // no signal: deterministic pick from seed
  return MOOD_ORDER.filter((m) => s[m] === best)[seed % MOOD_ORDER.filter((m) => s[m] === best).length];
}

export function extractMotifs(text: string, max = 3): string[] {
  const freq = new Map<string, number>();
  for (const w of words(text)) if (w.length > 4 && !STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, max).map(([w]) => w);
}

const PROP_RULES: [RegExp, PropKind][] = [
  [/book|read|study|школ|книг|читал|учил/i, 'book'], [/coffee|tea|cup|dinner|cook|кофе|чай|ужин|готов/i, 'cup'],
  [/flower|garden|tree|park|walk|цвет|сад|парк|прогул|дерев/i, 'plant'], [/song|music|sing|concert|музык|песн|концерт/i, 'note'],
  [/photo|picture|друз|friend|фото/i, 'frame'], [/home|door|key|house|дом|ключ/i, 'key'], [/work|meeting|office|работ|встреч/i, 'chair'],
  [/night|light|lamp|evening|вечер|свет|ночь/i, 'lamp'],
];
const PROPS_CYCLE: PropKind[] = ['lamp', 'book', 'cup', 'plant', 'frame', 'key'];

export function splitFragments(text: string, max = 3): string[] {
  const parts = text.replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+|[\n;]+/).map((s) => s.trim()).filter((s) => s.length > 3);
  const clip = (s: string) => (s.length > 90 ? s.slice(0, 87).replace(/\s+\S*$/, '') + '…' : s);
  return parts.slice(0, max).map(clip);
}

export interface MediaInput { kind: 'photo' | 'video'; image?: string }
export interface InterpretInput { text: string; media: MediaInput[]; hasMusic: boolean; }

export function interpretDay(inp: InterpretInput): MoodConfig {
  const text = inp.text.trim();
  const seed = hashString(text + (inp.media.length ? '|p' + inp.media.map((m) => m.kind).join() : '') + (inp.hasMusic ? '|m' : ''));
  const moodId = pickMood(text, seed);
  const preset = PRESETS[moodId];
  const found = extractMotifs(text);
  const motifs = [...found, ...preset.defaultMotifs].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
  const motifWord = found[0] ?? preset.defaultMotifs[0];
  const title = preset.titles[seed % preset.titles.length].replace('{m}', motifWord.replace(/^./, (c) => c.toUpperCase()));
  const fragments: Fragment[] = splitFragments(text, Math.max(1, 5 - inp.media.length - (inp.hasMusic ? 1 : 0))).map((caption, i) => ({
    id: `t${i}`, kind: 'text', caption, prop: PROP_RULES.find(([r]) => r.test(caption))?.[1] ?? PROPS_CYCLE[(seed + i) % PROPS_CYCLE.length],
  }));
  inp.media.forEach((m, i) => fragments.push({ id: `m${i}`, kind: 'photo', prop: 'frame', caption: m.kind === 'video' ? 'A moment from your video' : 'A picture from your day', image: m.image }));
  if (inp.hasMusic) fragments.push({ id: 'music', kind: 'music', prop: 'note', caption: 'The song you chose' });
  return {
    schemaVersion: 1, seed, interpreter: 'local-rules', title, moodId, moodLabel: preset.label, environment: preset.environment,
    motifs, palette: preset.palette, particles: preset.particles, decor: preset.decor, fragments: fragments.slice(0, 5),
  };
}
