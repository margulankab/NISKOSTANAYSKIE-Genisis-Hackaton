import { beforeAll, describe, expect, it } from 'vitest';
import { createInMemoryStore } from '../src/data/repository';
import { fixtures, loadFixture, playableFixture } from '../src/fixtures/memories';
import { dayBundleSchema, memorySceneSchema, resolvePresentation } from '../src/shared/memory-schema';
import type { DayBundle, MemoryScene } from '../src/shared/memory-schema';
import { createViewerProps } from '../src/shared/memory-viewer';
import { getSceneStyle } from '../src/scene/scene-style';

let bundles: DayBundle[];
beforeAll(async () => {
  bundles = await Promise.all(fixtures.map(loadFixture));
});

describe('MW-000 / AT-02', () => {
  it('turns every example into a full world with its own in-game score', () => {
    const tracks = new Set<string>();
    bundles.forEach((bundle, index) => {
      const playable = playableFixture(bundle, fixtures[index]);
      expect(playable.world?.layout.geometryVersion).toBeTruthy();
      expect(playable.audio.filename).not.toBe(bundle.audio.filename);
      expect(playable.entryText).toBe(bundle.entryText);
      expect(playable.world?.interpretation.timeOfDay).toBe(fixtures[index].context.timeOfDay);
      tracks.add(playable.audio.filename);
    });
    expect(tracks.size).toBe(5);
  });

  it('accepts five distinct complete fixtures and resolves their replay data', async () => {
    expect(new Set(bundles.map(({ manifest }) => manifest.id)).size).toBe(5);
    expect(bundles.map(({ manifest }) => manifest.mood.primary)).toEqual(['nostalgic', 'tense', 'calm', 'joyful', 'nostalgic']);
    expect(bundles.map(({ manifest }) => manifest.context.environment)).toEqual(['park', 'room', 'city', 'park', 'room']);
    for (const bundle of bundles) {
      const { manifest } = dayBundleSchema.parse(bundle);
      const viewer = createViewerProps(bundle, () => {});
      const [{ photoId }, { excerpt }] = manifest.artifacts;
      expect(viewer.entryText.slice(excerpt?.start, excerpt?.end)).toBe(bundle.entryText.split('.')[0] + '.');
      const image = await viewer.resolveAsset(photoId!);
      const wav = await viewer.resolveAsset(manifest.source.audioId);
      expect(image.type).toBe('image/png');
      expect(new Uint8Array(await image.slice(0, 4).arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
      expect(wav.type).toBe('audio/wav');
      expect(await wav.slice(0, 4).text()).toBe('RIFF');
      expect(manifest.presentation.parameters.motionSpeed).toBe(0.25 + 0.75 * manifest.music.meanEnergy);
      expect(manifest.presentation.parameters.artifactSpacing)
        .toBe(2.4 - 0.6 * manifest.mood.tension + 0.3 * (1 - manifest.music.meanEnergy));
      await expect(viewer.resolveAsset(manifest.source.entryId)).rejects.toThrow('missing an asset');
    }
  });

  it.each<[string, (scene: MemoryScene) => unknown]>([
    ['unknown root key', (scene) => ({ ...scene, url: 'https://example.test' })],
    ['unknown nested key', (scene) => ({ ...scene, context: { ...scene.context, shader: 'code' } })],
    ['unknown rule', (scene) => ({ ...scene, presentation: {
      ...scene.presentation, appliedRules: [{ id: 'external' }, ...scene.presentation.appliedRules.slice(1)],
    } })],
    ['unknown mood', (scene) => ({ ...scene, mood: { ...scene.mood, primary: 'diagnosis' } })],
    ['unsupported schema version', (scene) => ({ ...scene, schemaVersion: 2 })],
    ['unsupported rules version', (scene) => ({ ...scene, rulesVersion: 2 })],
    ['AI provenance', (scene) => ({ ...scene, generation: { ...scene.generation, mode: 'ai' } })],
    ['NaN', (scene) => ({ ...scene, mood: { ...scene.mood, warmth: Number.NaN } })],
    ['infinity', (scene) => ({ ...scene, mood: { ...scene.mood, warmth: Infinity } })],
    ['out-of-range seed', (scene) => ({ ...scene, seed: 2 ** 32 })],
    ['invalid calendar date', (scene) => ({ ...scene, date: '2026-02-29' })],
    ['short title', (scene) => ({ ...scene, title: 'One word' })],
    ['long title', (scene) => ({ ...scene, title: 'One two three four five six seven eight' })],
    ['unsafe title', (scene) => ({ ...scene, title: 'A walk / home' })],
    ['control character in title', (scene) => ({ ...scene, title: 'A walk home\u0000' })],
    ['final line break in title', (scene) => ({ ...scene, title: 'A walk home\n' })],
    ['foreign photo metadata', (scene) => ({ ...scene, photos: [{ ...scene.photos[0], assetId: scene.source.entryId }] })],
    ['duplicate photo reference', (scene) => ({ ...scene, source: { ...scene.source, photoIds: [...scene.source.photoIds, ...scene.source.photoIds] } })],
    ['mismatched audio frame count', (scene) => ({ ...scene, music: { ...scene.music, durationSec: 90 } })],
    ['unknown visual parameter', (scene) => ({ ...scene, presentation: {
      ...scene.presentation, parameters: { ...scene.presentation.parameters, motionSpeed: 0.5 },
    } })],
    ['missing artifact', (scene) => ({ ...scene, artifacts: scene.artifacts.slice(0, 1) })],
    ['duplicate artifact ID', (scene) => ({ ...scene, artifacts: [scene.artifacts[0], { ...scene.artifacts[1], id: scene.artifacts[0].id }] })],
    ['foreign artifact reference', (scene) => ({ ...scene, artifacts: [
      { ...scene.artifacts[0], photoId: scene.source.audioId }, scene.artifacts[1],
    ] })],
    ['reversed excerpt', (scene) => ({ ...scene, artifacts: [scene.artifacts[0], { ...scene.artifacts[1], excerpt: { start: 5, end: 4 } }] })],
    ['invented excerpt', (scene) => ({ ...scene, artifacts: [scene.artifacts[0], { ...scene.artifacts[1], text: 'A fabricated quotation.' }] })],
  ])('rejects %s', (_name, modify) => {
    expect(memorySceneSchema.safeParse(modify(bundles[0].manifest)).success).toBe(false);
  });

  it.each<[string, (bundle: DayBundle) => unknown]>([
    ['missing photo', (bundle) => ({ ...bundle, photos: [] })],
    ['unrelated audio', (bundle) => ({ ...bundle, audio: { ...bundle.audio, id: bundle.manifest.source.entryId } })],
    ['wrong blob MIME', (bundle) => ({ ...bundle, audio: { ...bundle.audio, blob: new Blob(['unsafe'], { type: 'text/html' }) } })],
    ['missing rights', (bundle) => ({ ...bundle, rights: bundle.rights.slice(0, 1) })],
    ['excerpt beyond source length', (bundle) => ({
      ...bundle,
      manifest: { ...bundle.manifest, artifacts: [
        bundle.manifest.artifacts[0], { ...bundle.manifest.artifacts[1], excerpt: { start: 0, end: 6000 } },
      ] },
    })],
  ])('rejects a bundle with %s', (_name, modify) => {
    expect(dayBundleSchema.safeParse(modify(bundles[0])).success).toBe(false);
  });
});

it('replays scene styling deterministically and isolates context and photo inputs', () => {
  const { manifest } = bundles[0];
  const original = getSceneStyle(manifest);
  expect(getSceneStyle(structuredClone(manifest))).toEqual(original);
  expect(getSceneStyle({ ...manifest, seed: 0xffffffff }).variation).not.toEqual(original.variation);
  expect(getSceneStyle({ ...manifest, context: { ...manifest.context, environment: 'room' } }))
    .toEqual({ ...original, environment: 'room' });

  const photo = {
    ...manifest.photos[0],
    meanLightness: 1,
    palette: [[8, 70, 198], [11, 40, 93], [140, 180, 249]],
  } satisfies MemoryScene['photos'][number];
  const presentation = resolvePresentation(photo, manifest.mood, manifest.music.meanEnergy);
  expect(getSceneStyle({ ...manifest, photos: [photo], presentation })).toEqual({
    ...original,
    accentPalette: photo.palette,
    ambientIntensity: 1.3,
  });
});

it('reopens a saved fixture by UUID and isolates mutable manifest data', async () => {
  const store = createInMemoryStore();
  const [first, second] = bundles;
  await store.save(first);
  await store.save(second);
  expect(await store.list()).toHaveLength(2);
  const reopened = await store.load(first.manifest.id);
  expect(reopened).toEqual(first);
  reopened!.manifest.title = 'A revised fixture title';
  expect((await store.load(first.manifest.id))?.manifest.title).toBe(first.manifest.title);
  await store.delete(first.manifest.id);
  expect(await store.load(first.manifest.id)).toBeUndefined();
  expect(await store.load(second.manifest.id)).toEqual(second);
});
