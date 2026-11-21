import { composeWorld } from '../world/compose-world';
import { PROMPT_MAX } from '../world/layout-schema';
import { analyzePhoto } from '../media/photo-analysis';
import { dayBundleSchema, resolvePresentation } from '../shared/memory-schema';
import type { DayBundle, MemoryScene } from '../shared/memory-schema';
import type { ValidatedDayDraft } from './validate-day-draft';

type Mood = MemoryScene['mood']['primary'];
type Environment = MemoryScene['context']['environment'];
type TimeOfDay = MemoryScene['context']['timeOfDay'];

const moodWords = {
  calm: ['calm', 'quiet', 'peaceful', 'relaxed', 'still', 'gentle'],
  nostalgic: ['remembered', 'remember', 'childhood', 'again', 'familiar', 'old', 'missed'],
  tense: ['tense', 'anxious', 'worried', 'rushed', 'scared', 'nervous'],
  joyful: ['happy', 'laughed', 'joyful', 'excited', 'celebrated', 'smiled'],
} satisfies Partial<Record<Mood, string[]>>;
const environmentWords = {
  park: ['park', 'garden', 'trail', 'trees', 'river', 'grass', 'lake', 'woods'],
  city: ['city', 'street', 'station', 'traffic', 'train', 'bus', 'sidewalk', 'skyline'],
  room: ['room', 'home', 'kitchen', 'window', 'apartment', 'desk', 'bedroom'],
} satisfies Record<Environment, string[]>;
const timeWords = {
  day: ['morning', 'afternoon', 'noon', 'daylight', 'sunrise'],
  dusk: ['dusk', 'sunset', 'twilight', 'evening'],
  night: ['night', 'midnight', 'moonlight', 'moon', 'dark'],
} satisfies Partial<Record<TimeOfDay, string[]>>;
const moods: Record<Mood, Omit<MemoryScene['mood'], 'primary'>> = {
  calm: { warmth: 0.5, energy: 0.2, tension: 0.1, valence: 0.6 },
  nostalgic: { warmth: 0.8, energy: 0.25, tension: 0.1, valence: 0.7 },
  tense: { warmth: 0.25, energy: 0.8, tension: 0.85, valence: 0.35 },
  joyful: { warmth: 0.85, energy: 0.75, tension: 0.2, valence: 0.9 },
  mixed: { warmth: 0.5, energy: 0.5, tension: 0.35, valence: 0.5 },
};
const photoProps = {
  park: ['bench', 'frame'],
  city: ['lamp'],
  room: ['desk', 'cup'],
} as const;
const titleStopWords = new Set('a an and as at be but by for from had i in is it me my of on or our she that the then they this to was we were with you'.split(' '));
const titleLeadVerbs = new Set(['feel', 'felt', 'remember', 'remembered', 'saw', 'watched']);

function words(text: string) {
  return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) ?? [];
}

function strongestMatch<Groups extends Record<string, readonly string[]>>(textWords: readonly string[], groups: Groups) {
  let match: Extract<keyof Groups, string> | undefined;
  let bestScore = 0;
  for (const key in groups) {
    const score = textWords.filter((word) => groups[key].includes(word)).length;
    if (score > bestScore) {
      bestScore = score;
      match = key;
    }
  }
  return match;
}

function selectExcerpt(text: string, keywords: readonly string[]) {
  const sentences = [...text.matchAll(/[^.!?。！？\r\n]+[.!?。！？]*/gu)];
  const sentence = sentences.find(([part]) => words(part.toLowerCase()).some((word) => keywords.includes(word)))
    ?? sentences.find(([part]) => part.trim());
  const source = sentence?.[0] ?? text;
  const start = (sentence?.index ?? 0) + source.length - source.trimStart().length;
  const excerpt = Array.from(source.trim()).slice(0, 200).join('').trimEnd();
  return { start, end: start + excerpt.length };
}

function createTitle(excerpt: string, entryText: string, date: string) {
  // Cap the word length in UTF-16 units to fit the shared title's path budget.
  const usable = (text: string) => words(text).filter((word) => word.length <= 16);
  const excerptWords = usable(excerpt);
  const sourceWords = excerptWords.length ? excerptWords : usable(entryText);
  const start = sourceWords.findIndex((word) => {
    const lower = word.toLowerCase();
    return !titleStopWords.has(lower) && !titleLeadVerbs.has(lower);
  });
  const chosen = sourceWords.slice(Math.max(0, start), Math.max(0, start) + 4);
  while (chosen.length > 1 && titleStopWords.has(chosen[chosen.length - 1].toLowerCase())) chosen.pop();
  if (chosen.length === 0) return `Remembering The Day ${date}`;
  if (chosen.length === 1) return `Remembering A Day With ${chosen[0]}`;
  return `Remembering ${chosen.join(' ')}`;
}

function createSeed(date: string, text: string) {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(`${date}\n${text}`)) {
    hash = Math.imul(hash ^ byte, 0x01000193);
  }
  return hash >>> 0;
}

function artifactId(entryId: string, mask: 1 | 2) {
  // Change only the final hex digit so the UUID version and variant are preserved.
  return `${entryId.slice(0, -1)}${(parseInt(entryId.slice(-1), 16) ^ mask).toString(16)}`;
}

export async function generateMemory(draft: ValidatedDayDraft): Promise<DayBundle> {
  const { entryId, entryText, date, rights } = draft;
  const textWords = words(entryText.toLowerCase());
  const matchedMood = strongestMatch(textWords, moodWords);
  const matchedEnvironment = strongestMatch(textWords, environmentWords);
  const matchedTime = strongestMatch(textWords, timeWords);
  const primary = matchedMood ?? 'mixed';
  const environment = matchedEnvironment ?? 'room';
  const mood: MemoryScene['mood'] = { primary, ...moods[primary] };
  const excerpt = selectExcerpt(entryText, [
    ...(matchedMood ? moodWords[matchedMood] : []),
    ...(matchedEnvironment ? environmentWords[matchedEnvironment] : []),
    ...(matchedTime ? timeWords[matchedTime] : []),
  ]);
  const title = createTitle(entryText.slice(excerpt.start, excerpt.end), entryText, date);
  const seed = createSeed(date, entryText);
  const photos = draft.photos.map(({ id, filename, mime, blob }) => ({ id, filename, mime, blob }));
  const { music, ...audio } = draft.audio;
  const photoFeatures: MemoryScene['photos'] = [];
  for (const { id, blob } of photos) {
    photoFeatures.push({ assetId: id, ...await analyzePhoto(blob) });
  }
  const firstPhoto = photoFeatures[0];
  if (!firstPhoto) throw new Error('The draft is missing a photo.');
  const availableProps = photoProps[environment];

  const placed = composeWorld(entryText.slice(0, PROMPT_MAX), { id: entryId, seed });
  const world = placed.ok ? { layout: placed.world.layout, interpretation: placed.world.interpretation } : undefined;
  return dayBundleSchema.parse({
    manifest: {
      id: entryId,
      schemaVersion: 1,
      rulesVersion: 1,
      seed,
      date,
      title,
      generation: {
        mode: 'rules',
        model: null,
        fallbackReason: matchedMood || matchedEnvironment || matchedTime ? null : 'no-keyword-match',
      },
      source: { entryId, photoIds: photos.map(({ id }) => id), audioId: audio.id },
      mood,
      context: { environment, timeOfDay: matchedTime ?? 'unknown' },
      photos: photoFeatures,
      music,
      artifacts: [
        { id: artifactId(entryId, 1), kind: availableProps[seed % availableProps.length], photoId: firstPhoto.assetId, excerpt: null },
        { id: artifactId(entryId, 2), kind: 'note', photoId: null, excerpt },
      ],
      presentation: resolvePresentation(firstPhoto, mood, music.meanEnergy),
    },
    entryText,
    ...(world && { world }),
    photos,
    audio,
    rights,
  });
}
