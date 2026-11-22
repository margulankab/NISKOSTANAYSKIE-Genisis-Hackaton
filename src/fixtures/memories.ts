import nostalgicParkImage from './media/nostalgic-park.png?inline';
import tenseRoomImage from './media/tense-room.png?inline';
import calmCityImage from './media/calm-city.png?inline';
import joyfulReunionImage from './media/joyful-reunion.png?inline';
import rainyKitchenImage from './media/rainy-kitchen.png?inline';
import { dayBundleSchema, resolvePresentation } from '../shared/memory-schema';
import type { DayBundle, MemoryScene } from '../shared/memory-schema';
import { createTestTone } from './test-tone';
import { createCatalogSoundtrack } from '../media/world-soundtrack';
import type { CatalogTrackId } from '../media/world-soundtrack';
import { composeSceneTemplate } from '../world/compose-scene-template';
import { composeWorld } from '../world/compose-world';
import { PROMPT_MAX } from '../world/layout-schema';

interface Fixture {
  slug: string;
  seed: number;
  date: string;
  title: string;
  entryText: string;
  context: MemoryScene['context'];
  mood: MemoryScene['mood'];
  image: string;
  caption: string;
  palette: MemoryScene['photos'][number]['palette'];
  lightness: number;
  frequency: number;
  amplitude: number;
  /** The in-game score the example plays when entered as a full world. */
  track: CatalogTrackId;
}

export const fixtures = [
  {
    slug: 'nostalgic-park', track: 'warm-tape',
    seed: 101,
    date: '2026-10-04',
    title: 'The last light in the park',
    entryText: 'The last light in the park held on after the paths emptied. I took the long way around the bench before going home.',
    context: { environment: 'park', timeOfDay: 'dusk' },
    mood: { primary: 'nostalgic', warmth: 0.8, energy: 0.25, tension: 0.1, valence: 0.7 },
    image: nostalgicParkImage,
    caption: 'An amber sun over a winding park path.',
    palette: [[239, 188, 122], [104, 113, 94], [53, 84, 73]],
    lightness: 0.451741,
    frequency: 220,
    amplitude: 0.09,
  },
  {
    slug: 'tense-room', track: 'still-rooms',
    seed: 202,
    date: '2026-10-11',
    title: 'The room before the call',
    entryText: 'The room before the call felt smaller than usual. I turned on the desk lamp and sat beside the rain-dark window.',
    context: { environment: 'room', timeOfDay: 'night' },
    mood: { primary: 'tense', warmth: 0.25, energy: 0.8, tension: 0.85, valence: 0.35 },
    image: tenseRoomImage,
    caption: 'A desk lamp beside a dark window.',
    palette: [[43, 37, 54], [145, 121, 147], [214, 153, 110]],
    lightness: 0.267422,
    frequency: 330,
    amplitude: 0.25,
  },
  {
    slug: 'calm-city', track: 'night-drive',
    seed: 303,
    date: '2026-10-18',
    title: 'The city by the river',
    entryText: 'The city by the river felt quiet enough to hear the water. I watched the lit windows from the far bank.',
    context: { environment: 'city', timeOfDay: 'night' },
    mood: { primary: 'calm', warmth: 0.5, energy: 0.2, tension: 0.1, valence: 0.6 },
    image: calmCityImage,
    caption: 'Quiet buildings and lit windows above the river.',
    palette: [[35, 58, 77], [139, 163, 164], [188, 168, 125]],
    lightness: 0.363614,
    frequency: 180,
    amplitude: 0.06,
  },
  {
    slug: 'joyful-reunion', track: 'lantern-market',
    seed: 404,
    date: '2026-10-24',
    title: 'Laughing by the gazebo',
    entryText: 'We laughed by the gazebo when everyone finally reached the park. Afternoon light caught the flowers beside the bench.',
    context: { environment: 'park', timeOfDay: 'day' },
    mood: { primary: 'joyful', warmth: .85, energy: .75, tension: .2, valence: .9 },
    image: joyfulReunionImage,
    caption: 'Afternoon light on a park gazebo and flower beds.',
    palette: [[94, 124, 103], [208, 165, 125], [230, 189, 126]],
    lightness: .49,
    frequency: 264,
    amplitude: .17,
  },
  {
    slug: 'rainy-kitchen', track: 'coastal-light',
    seed: 505,
    date: '2026-11-02',
    title: 'Rain beyond the kitchen window',
    entryText: 'I remembered the quiet kitchen as rain reached the garden. A cup of tea warmed the table beneath the window.',
    context: { environment: 'room', timeOfDay: 'day' },
    mood: { primary: 'nostalgic', warmth: .8, energy: .25, tension: .1, valence: .7 },
    image: rainyKitchenImage,
    caption: 'A cup on a kitchen sill overlooking the rainy garden.',
    palette: [[152, 120, 100], [92, 120, 109], [187, 176, 148]],
    lightness: .48,
    frequency: 196,
    amplitude: .07,
  },
] satisfies Fixture[];

function fixtureId(seed: number, tag: number) {
  return `00000000-0000-4000-8000-${String(seed * 100 + tag).padStart(12, '0')}`;
}

export async function loadFixture(fixture: Fixture): Promise<DayBundle> {
  const response = await fetch(fixture.image);
  if (!response.ok) throw new Error('Could not load the fixture image.');
  const image = await response.blob();
  const { blob: tone, music } = createTestTone(fixture.frequency, fixture.amplitude);
  const photoId = fixtureId(fixture.seed, 2);
  const audioId = fixtureId(fixture.seed, 3);
  const photo = {
    assetId: photoId,
    palette: fixture.palette,
    meanLightness: fixture.lightness,
    width: 480,
    height: 300,
    caption: fixture.caption,
  };
  const excerpt = { start: 0, end: fixture.entryText.indexOf('.') + 1 };
  const permission = 'Original project test asset for playback, export, and demo recording.';

  return dayBundleSchema.parse({
    manifest: {
      id: fixtureId(fixture.seed, 0),
      schemaVersion: 1,
      rulesVersion: 1,
      seed: fixture.seed,
      date: fixture.date,
      title: fixture.title,
      generation: { mode: 'rules', model: null, fallbackReason: null },
      source: { entryId: fixtureId(fixture.seed, 1), photoIds: [photoId], audioId },
      mood: fixture.mood,
      context: fixture.context,
      photos: [photo],
      music,
      artifacts: [
        { id: fixtureId(fixture.seed, 4), kind: 'frame', photoId, excerpt: null },
        { id: fixtureId(fixture.seed, 5), kind: 'note', photoId: null, excerpt },
      ],
      presentation: resolvePresentation(photo, fixture.mood, music.meanEnergy),
    },
    entryText: fixture.entryText,
    photos: [{ id: photoId, filename: `${fixture.slug}.png`, mime: 'image/png', blob: image }],
    audio: { id: audioId, filename: `${fixture.slug}.wav`, mime: 'audio/wav', blob: tone },
    rights: [
      { assetId: photoId, source: 'Original procedural illustration for this fictional fixture.', permission },
      { assetId: audioId, source: 'Original PCM test tone generated by the fixture.', permission },
    ],
  });
}

/**
 * The example as a full world, like a day made in Create: the same journal text builds the
 * walkable world, and a mood-matched in-game score replaces the preview's test tone.
 */
export function playableFixture(bundle: DayBundle, fixture: Fixture): DayBundle {
  const id = bundle.manifest.id;
  const text = bundle.entryText.slice(0, PROMPT_MAX);
  const composed = composeSceneTemplate(text, { id });
  const placed = composed.ok ? composed : composeWorld(text, { id, seed: fixture.seed });
  const score = createCatalogSoundtrack(fixture.track);
  if (!placed.ok || !score.blob || score.record.kind === 'silent') return bundle;
  const music = score.record.music;
  const playable = dayBundleSchema.safeParse({
    ...bundle,
    manifest: { ...bundle.manifest, music, presentation: resolvePresentation(bundle.manifest.photos[0], bundle.manifest.mood, music.meanEnergy) },
    // The example's own light (a night city, a park at dusk) even where its words do not name the hour.
    world: { layout: placed.world.layout, interpretation: { ...placed.world.interpretation,
      ...(fixture.context.timeOfDay !== 'unknown' && { timeOfDay: fixture.context.timeOfDay }) } },
    audio: { ...bundle.audio, filename: `${score.record.title}.wav`, blob: score.blob },
  });
  return playable.success ? playable.data : bundle;
}
