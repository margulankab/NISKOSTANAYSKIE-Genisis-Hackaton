// The in-game score: original compositions synthesized at runtime. Data only, so the Gemini gateway
// can list the same tracks (with their tags) that the game can play.
export const soundtrackCatalogVersion = 1;

export const soundtrackDimensions = ['mood', 'setting', 'energy'] as const;
export type SoundtrackCues = Partial<Record<(typeof soundtrackDimensions)[number], readonly string[]>>;
export type Composition = {
  title: string;
  tags: Required<SoundtrackCues>;
  beatSeconds: number;
  notes: readonly number[];
  bass: readonly number[];
  amplitude: number;
  percussion: number;
  /** Voice colour: soft (default) sine, a ringing bell, a short pluck, or a slow-swelling pad. */
  timbre?: 'soft' | 'bell' | 'pluck' | 'pad';
  /** Beats per bass note (4 by default; 3 for a waltz). */
  bar?: number;
};

export const compositions = {
  'coastal-light': {
    title: 'Coastal Light',
    tags: { mood: ['calm', 'peaceful'], setting: ['coastal', 'cove', 'shore', 'lighthouse'], energy: ['gentle', 'low'] },
    beatSeconds: 0.85,
    notes: [62, 69, 74, 66, 64, 69, 73, 69, 62, 66, 69, 74, 71, 69, 66, 64],
    bass: [38, 45, 43, 45], amplitude: 0.17, percussion: 0,
  },
  'lantern-market': {
    title: 'Lantern Market',
    tags: { mood: ['joyful', 'lively'], setting: ['market', 'city', 'stall', 'railway'], energy: ['bright', 'high'] },
    beatSeconds: 0.48,
    notes: [65, 69, 72, 74, 72, 69, 67, 64, 65, 69, 72, 77, 76, 72, 74, 67],
    bass: [41, 45, 46, 48], amplitude: 0.32, percussion: 0.16,
  },
  'still-rooms': {
    title: 'Still Rooms',
    tags: { mood: ['subdued', 'nostalgic', 'tense'], setting: ['room', 'indoors', 'fog'], energy: ['subdued', 'low'] },
    beatSeconds: 1.1,
    notes: [57, 60, 64, 60, 55, 59, 62, 59, 53, 57, 60, 64, 55, 62, 59, 55],
    bass: [33, 31, 29, 31], amplitude: 0.12, percussion: 0,
  },
  'warm-tape': {
    title: 'Warm Tape',
    tags: { mood: ['nostalgic', 'peaceful'], setting: ['park', 'garden', 'home'], energy: ['gentle'] },
    beatSeconds: 0.72,
    notes: [65, 69, 72, 76, 74, 72, 69, 67, 64, 67, 71, 74, 72, 69, 65, 67],
    bass: [41, 38, 43, 36], amplitude: 0.19, percussion: 0.05,
  },
  'night-drive': {
    title: 'Night Drive',
    tags: { mood: ['lively', 'tense'], setting: ['city', 'railway', 'night'], energy: ['high', 'bright'] },
    beatSeconds: 0.4,
    notes: [69, 72, 76, 72, 69, 72, 76, 79, 67, 71, 74, 71, 65, 69, 72, 76],
    bass: [45, 45, 43, 41], amplitude: 0.26, percussion: 0.22,
  },
  'rain-window': {
    title: 'Rain on the Window',
    tags: { mood: ['nostalgic', 'subdued', 'tense'], setting: ['rain', 'room', 'interior', 'window', 'cafe', 'library'], energy: ['low', 'subdued'] },
    beatSeconds: 1, timbre: 'bell',
    notes: [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 64, 67, 71, 67],
    bass: [45, 43, 41, 40], amplitude: 0.14, percussion: 0,
  },
  'sunrise-fields': {
    title: 'Sunrise Fields',
    tags: { mood: ['relieved', 'peaceful', 'calm', 'joyful'], setting: ['rural', 'farm', 'field', 'meadow', 'dawn', 'garden'], energy: ['gentle', 'bright'] },
    beatSeconds: 0.62, timbre: 'pluck',
    notes: [67, 71, 74, 79, 76, 74, 71, 69, 67, 69, 71, 74, 76, 74, 72, 71],
    bass: [43, 48, 50, 43], amplitude: 0.2, percussion: 0.04,
  },
  'festival-lights': {
    title: 'Festival Lights',
    tags: { mood: ['joyful', 'lively'], setting: ['party', 'gathering', 'festival', 'celebration', 'fair', 'crowd'], energy: ['high', 'bright'] },
    beatSeconds: 0.36, timbre: 'pluck',
    notes: [74, 78, 81, 78, 76, 79, 83, 79, 74, 78, 81, 86, 85, 81, 83, 78],
    bass: [38, 43, 45, 38], amplitude: 0.24, percussion: 0.22,
  },
  'deep-woods': {
    title: 'Deep Woods',
    tags: { mood: ['curious', 'tense', 'calm'], setting: ['woodland', 'forest', 'cavern', 'fantasy', 'trail'], energy: ['low', 'gentle'] },
    beatSeconds: 0.9, timbre: 'pad',
    notes: [64, 67, 71, 73, 71, 67, 66, 64, 62, 66, 69, 71, 69, 66, 64, 62],
    bass: [40, 38, 40, 35], amplitude: 0.14, percussion: 0.03,
  },
  'snow-hush': {
    title: 'Snow Hush',
    tags: { mood: ['calm', 'peaceful', 'nostalgic'], setting: ['snow', 'winter', 'mountain', 'cabin'], energy: ['low', 'gentle'] },
    beatSeconds: 1.15, timbre: 'bell',
    notes: [84, 79, 76, 78, 79, 84, 86, 83, 81, 78, 76, 74, 76, 79, 83, 84],
    bass: [48, 43, 45, 41], amplitude: 0.1, percussion: 0,
  },
  'summer-splash': {
    title: 'Summer Splash',
    tags: { mood: ['joyful', 'lively', 'relieved'], setting: ['water-park', 'pool', 'beach', 'aquapark', 'slide'], energy: ['high', 'bright'] },
    beatSeconds: 0.42, timbre: 'pluck',
    notes: [77, 81, 84, 81, 79, 82, 86, 82, 77, 81, 84, 89, 88, 84, 86, 79],
    bass: [41, 46, 48, 41], amplitude: 0.23, percussion: 0.18,
  },
  'ballpark-anthem': {
    title: 'Ballpark Anthem',
    tags: { mood: ['joyful', 'lively', 'relieved'], setting: ['ballfield', 'stadium', 'sport', 'baseball', 'field'], energy: ['high', 'bright'] },
    beatSeconds: 0.5,
    notes: [72, 76, 79, 84, 83, 79, 76, 79, 77, 81, 84, 81, 79, 76, 74, 72],
    bass: [48, 53, 55, 48], amplitude: 0.25, percussion: 0.2,
  },
  'last-train': {
    title: 'Last Train',
    tags: { mood: ['subdued', 'nostalgic', 'tense'], setting: ['station', 'train', 'railway', 'platform', 'farewell'], energy: ['low', 'subdued'] },
    beatSeconds: 0.95, timbre: 'pad',
    notes: [71, 74, 78, 74, 69, 73, 76, 73, 67, 71, 74, 71, 66, 69, 73, 66],
    bass: [47, 45, 43, 42], amplitude: 0.13, percussion: 0.06,
  },
  starfield: {
    title: 'Starfield',
    tags: { mood: ['curious', 'calm', 'peaceful'], setting: ['space', 'observatory', 'night', 'sky', 'fantasy'], energy: ['gentle', 'low'] },
    beatSeconds: 1.05, timbre: 'bell',
    notes: [76, 83, 88, 83, 80, 85, 90, 85, 78, 83, 87, 83, 76, 80, 83, 88],
    bass: [40, 45, 47, 44], amplitude: 0.11, percussion: 0,
  },
  'farewell-waltz': {
    title: 'Farewell Waltz',
    tags: { mood: ['subdued', 'nostalgic', 'mourning'], setting: ['funeral', 'memorial', 'church', 'cemetery', 'farewell'], energy: ['low', 'subdued'] },
    beatSeconds: 0.55, bar: 3,
    notes: [62, 65, 69, 64, 67, 70, 65, 69, 72, 64, 67, 70, 62, 65, 69, 61, 64, 69],
    bass: [38, 43, 41, 43, 38, 37], amplitude: 0.14, percussion: 0,
  },
} satisfies Record<string, Composition>;

export type CatalogTrackId = keyof typeof compositions;
export const catalogTrackIds = Object.keys(compositions) as CatalogTrackId[];

/** One line per track for a language model: id, title and tags. */
export function describeCatalog() {
  return catalogTrackIds.map(id => {
    const { title, tags } = compositions[id] as Composition;
    return `${id} (${title}): mood ${tags.mood.join('/')}; setting ${tags.setting.join('/')}; energy ${tags.energy.join('/')}`;
  }).join('\n');
}
