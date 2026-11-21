import { z } from 'zod';

const id = z.uuid();
const fraction = z.number().min(0).max(1);
const rgb = z.tuple([z.int().min(0).max(255), z.int().min(0).max(255), z.int().min(0).max(255)]);
const palette = z.tuple([rgb, rgb, rgb]);
const word = String.raw`[\p{L}\p{N}][\p{L}\p{M}\p{N}]*(?:['’\-][\p{L}\p{N}][\p{L}\p{M}\p{N}]*)*`;
export const memoryTitleSchema = z.string().max(80).regex(
  new RegExp(`^${word}(?: ${word}){2,6}$`, 'u'),
  'Use 3–7 words separated by spaces.',
);
export const entryTextSchema = z.string().max(6000).refine(
  (text) => text.trim().length >= 20,
  'Enter at least 20 characters about the day.',
);
export const entryDateSchema = z.iso.date();
export const PHOTO_BYTES_LIMIT = 5 * 1024 ** 2;
export const PHOTO_PIXELS_LIMIT = 16_000_000;
export const AUDIO_BYTES_LIMIT = 10 * 1024 ** 2;
export const AUDIO_DURATION_LIMIT = 90;

const moodSchema = z.strictObject({
  primary: z.enum(['calm', 'nostalgic', 'tense', 'joyful', 'mixed']),
  warmth: fraction,
  energy: fraction,
  tension: fraction,
  valence: fraction,
});

const photoSchema = z.strictObject({
  assetId: id,
  palette,
  meanLightness: fraction,
  width: z.int().min(1).max(PHOTO_PIXELS_LIMIT),
  height: z.int().min(1).max(PHOTO_PIXELS_LIMIT),
  caption: z.string().max(200).optional(),
}).refine(({ width, height }) => width * height <= PHOTO_PIXELS_LIMIT, 'Photo exceeds 16 megapixels.');

const musicSchema = z.strictObject({
  durationSec: z.number().min(1).max(AUDIO_DURATION_LIMIT),
  sampleStepSec: z.literal(0.1),
  energyEnvelope: z.array(fraction).min(10).max(900),
  meanEnergy: fraction,
  bpm: z.null(),
  key: z.null(),
  provenance: z.literal('measured'),
}).superRefine(({ durationSec, energyEnvelope, meanEnergy }, ctx) => {
  if (energyEnvelope.length !== Math.ceil(durationSec * 10)) {
    ctx.addIssue({ code: 'custom', path: ['energyEnvelope'], message: 'Expected one sample per 100 ms.' });
  }
  const mean = energyEnvelope.reduce((sum, sample) => sum + sample, 0) / energyEnvelope.length;
  if (Math.abs(mean - meanEnergy) > 0.000001) {
    ctx.addIssue({ code: 'custom', path: ['meanEnergy'], message: 'Mean does not match the envelope.' });
  }
});

const artifactSchema = z.strictObject({
  id,
  kind: z.enum(['frame', 'note', 'cup', 'bench', 'lamp', 'desk']),
  photoId: id.nullable(),
  excerpt: z.strictObject({
    start: z.int().min(0).max(5999),
    end: z.int().min(1).max(6000),
  }).refine(({ start, end }) => start < end, 'Excerpt must have a nonempty range.').nullable(),
}).refine(({ photoId, excerpt }) => photoId !== null || excerpt !== null, 'Artifact has no reveal.');

const visualParametersSchema = z.strictObject({
  accentPalette: palette,
  photoLightness: fraction,
  lightWarmth: fraction,
  motionSpeed: z.number().min(0.25).max(1),
  pulseGain: z.literal(0.04),
  artifactSpacing: z.number().min(1.79).max(2.71),
});

const explanation = z.string().min(1).max(200);
const presentationSchema = z.strictObject({
  parameters: visualParametersSchema,
  appliedRules: z.tuple([
    z.strictObject({
      id: z.literal('photo-palette'),
      source: z.strictObject({ assetId: id, palette, meanLightness: fraction }),
      result: visualParametersSchema.pick({ accentPalette: true, photoLightness: true }),
      explanation,
    }),
    z.strictObject({
      id: z.literal('music-motion'),
      source: z.strictObject({ meanEnergy: fraction }),
      result: visualParametersSchema.pick({ motionSpeed: true, pulseGain: true }),
      explanation,
    }),
    z.strictObject({
      id: z.literal('mood-composition'),
      source: z.strictObject({ warmth: fraction, tension: fraction, meanEnergy: fraction }),
      result: visualParametersSchema.pick({ lightWarmth: true, artifactSpacing: true }),
      explanation,
    }),
  ]),
});

export const memorySceneSchema = z.strictObject({
  id,
  schemaVersion: z.literal(1),
  rulesVersion: z.literal(1),
  seed: z.int().min(0).max(0xffffffff),
  date: entryDateSchema,
  title: memoryTitleSchema,
  generation: z.strictObject({
    mode: z.literal('rules'),
    model: z.null(),
    fallbackReason: z.enum(['no-keyword-match']).nullable(),
  }),
  source: z.strictObject({
    entryId: id,
    photoIds: z.array(id).min(1).max(3),
    audioId: id,
  }),
  mood: moodSchema,
  context: z.strictObject({
    environment: z.enum(['park', 'room', 'city']),
    timeOfDay: z.enum(['day', 'dusk', 'night', 'unknown']),
  }),
  photos: z.array(photoSchema).min(1).max(3),
  music: musicSchema,
  artifacts: z.tuple([artifactSchema, artifactSchema]),
  presentation: presentationSchema,
}).superRefine(({ source, photos, artifacts, presentation, mood, music }, ctx) => {
  const photoIds = new Set(source.photoIds);
  if (photoIds.size !== source.photoIds.length || photoIds.has(source.audioId)) {
    ctx.addIssue({ code: 'custom', path: ['source'], message: 'Media IDs must be distinct.' });
  }
  if (new Set(photos.map(({ assetId }) => assetId)).size !== photoIds.size
      || photos.length !== photoIds.size || photos.some(({ assetId }) => !photoIds.has(assetId))) {
    ctx.addIssue({ code: 'custom', path: ['photos'], message: 'Expected features for each source photo.' });
  }
  if (artifacts[0].id === artifacts[1].id
      || artifacts.some(({ photoId }) => photoId !== null && !photoIds.has(photoId))
      || !artifacts.some(({ photoId }) => photoId !== null)
      || !artifacts.some(({ excerpt }) => excerpt !== null)) {
    ctx.addIssue({ code: 'custom', path: ['artifacts'], message: 'Expected distinct artifacts with a source photo and excerpt.' });
  }

  const [photoRule, musicRule, moodRule] = presentation.appliedRules;
  const photo = photos.find(({ assetId }) => assetId === photoRule.source.assetId);
  if (!photo) {
    ctx.addIssue({ code: 'custom', path: ['presentation', 'appliedRules', 0], message: 'Photo rule must reference a source photo.' });
    return;
  }
  const expected = presentationSchema.parse(resolvePresentation(photo, mood, music.meanEnergy));
  if (JSON.stringify(presentation.parameters) !== JSON.stringify(expected.parameters)
      || JSON.stringify(photoRule.source) !== JSON.stringify(expected.appliedRules[0].source)
      || JSON.stringify(photoRule.result) !== JSON.stringify(expected.appliedRules[0].result)
      || JSON.stringify(musicRule.source) !== JSON.stringify(expected.appliedRules[1].source)
      || JSON.stringify(musicRule.result) !== JSON.stringify(expected.appliedRules[1].result)
      || JSON.stringify(moodRule.source) !== JSON.stringify(expected.appliedRules[2].source)
      || JSON.stringify(moodRule.result) !== JSON.stringify(expected.appliedRules[2].result)) {
    ctx.addIssue({ code: 'custom', path: ['presentation'], message: 'Rule data does not match source features and the v1 formulas.' });
  }
});

export type MemoryScene = z.infer<typeof memorySceneSchema>;

export function resolvePresentation(
  { assetId, palette, meanLightness }: z.infer<typeof photoSchema>,
  { warmth, tension }: z.infer<typeof moodSchema>,
  meanEnergy: number,
): z.infer<typeof presentationSchema> {
  const photo = { accentPalette: palette, photoLightness: meanLightness };
  const music = { motionSpeed: 0.25 + 0.75 * meanEnergy, pulseGain: 0.04 as const };
  const mood = { lightWarmth: warmth, artifactSpacing: 2.4 - 0.6 * tension + 0.3 * (1 - meanEnergy) };
  return {
    parameters: { ...photo, ...mood, ...music },
    appliedRules: [
      {
        id: 'photo-palette',
        source: { assetId, palette, meanLightness },
        result: photo,
        explanation: 'The source image supplies the accent colors and lightness.',
      },
      {
        id: 'music-motion',
        source: { meanEnergy },
        result: music,
        explanation: 'Measured audio energy sets movement speed and drives a small pulse during playback.',
      },
      {
        id: 'mood-composition',
        source: { warmth, tension, meanEnergy },
        result: mood,
        explanation: 'Warmth sets the light treatment. Tension and audio energy bring the artifacts closer together.',
      },
    ],
  };
}

const mediaRecord = {
  id,
  filename: z.string().min(1).max(255),
  blob: z.instanceof(Blob),
};
const photoMedia = z.strictObject({
  ...mediaRecord,
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
}).refine(({ blob, mime }) => blob.type === mime && blob.size > 0 && blob.size <= PHOTO_BYTES_LIMIT,
  'Photo MIME or size does not match the intake limits.');
const audioMedia = z.strictObject({
  ...mediaRecord,
  mime: z.enum(['audio/mpeg', 'audio/wav']),
}).refine(({ blob, mime }) => blob.type === mime && blob.size > 0 && blob.size <= AUDIO_BYTES_LIMIT,
  'Audio MIME or size does not match the intake limits.');

export const dayBundleSchema = z.strictObject({
  manifest: memorySceneSchema,
  entryText: entryTextSchema,
  photos: z.array(photoMedia).min(1).max(3),
  audio: audioMedia,
  rights: z.array(z.strictObject({
    assetId: id,
    source: z.string().trim().min(1).max(300),
    permission: z.string().trim().min(1).max(300),
  })).min(2).max(4),
  thumbnail: z.instanceof(Blob).refine(
    (blob) => blob.type === 'image/png' && blob.size > 0 && blob.size <= 5 * 1024 ** 2,
    'Expected a PNG thumbnail within the photo size limit.',
  ).optional(),
}).superRefine(({ manifest, entryText, photos, audio, rights }, ctx) => {
  const photoIds = new Set(photos.map(({ id }) => id));
  if (photos.length !== manifest.source.photoIds.length
      || manifest.source.photoIds.some((id) => !photoIds.has(id))
      || audio.id !== manifest.source.audioId) {
    ctx.addIssue({ code: 'custom', path: ['manifest', 'source'], message: 'Bundle media must match manifest references.' });
  }
  const mediaIds = new Set([...photoIds, audio.id]);
  if (rights.length !== mediaIds.size || new Set(rights.map(({ assetId }) => assetId)).size !== mediaIds.size
      || rights.some(({ assetId }) => !mediaIds.has(assetId))) {
    ctx.addIssue({ code: 'custom', path: ['rights'], message: 'Expected a rights record for each media asset.' });
  }
  for (const [index, { excerpt }] of manifest.artifacts.entries()) {
    if (excerpt && (excerpt.end > entryText.length || !entryText.slice(excerpt.start, excerpt.end).trim())) {
      ctx.addIssue({ code: 'custom', path: ['manifest', 'artifacts', index, 'excerpt'], message: 'Excerpt must reference nonblank original text.' });
    }
  }
});

export type DayBundle = z.infer<typeof dayBundleSchema>;
