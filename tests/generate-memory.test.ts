import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestTone } from '../src/fixtures/test-tone';
import { generateMemory } from '../src/intake/generate-memory';
import type { ValidatedDayDraft } from '../src/intake/validate-day-draft';
import { measureAudioBuffer } from '../src/media/audio-analysis';
import { analyzePhoto } from '../src/media/photo-analysis';
import { dayBundleSchema, memoryTitleSchema } from '../src/shared/memory-schema';
import { createViewerProps } from '../src/shared/memory-viewer';

vi.mock('../src/media/photo-analysis', () => ({ analyzePhoto: vi.fn() }));

function makeDraft(): ValidatedDayDraft {
  const photoId = '9a65a38e-7d16-4b4d-88c9-227983d45f46';
  const audioId = '9a65a38e-7d16-4b4d-88c9-227983d45f47';
  const tone = createTestTone(220, 0.09);
  return {
    entryId: '9a65a38e-7d16-4b4d-88c9-227983d45f48',
    date: '2026-10-04',
    entryText: '🪴\n  I remembered the trees by the river at dusk. Then I walked home.',
    photos: [{ id: photoId, mime: 'image/png', blob: new Blob(['photo'], { type: 'image/png' }),
      filename: 'river.png', width: 480, height: 300 }],
    audio: { id: audioId, mime: 'audio/wav', blob: tone.blob, filename: 'tone.wav', music: tone.music },
    rights: [photoId, audioId].map((assetId) => ({ assetId, source: 'Test', permission: 'Test' })),
  };
}

describe('local memory generation', () => {
  beforeEach(() => {
    vi.mocked(analyzePhoto).mockReset().mockResolvedValue({
      width: 480, height: 300, palette: [[12, 80, 40], [200, 240, 80], [30, 80, 120]], meanLightness: 0.45,
    });
  });

  it('reproduces the manifest and hands the original excerpt, photo, audio, and rights to the viewer', async () => {
    const draft = makeDraft();
    const bundle = await generateMemory(draft);
    const { manifest } = bundle;
    expect((await generateMemory(draft)).manifest).toEqual(manifest);
    expect(dayBundleSchema.safeParse(bundle).success).toBe(true);
    expect(manifest).toMatchObject({ id: draft.entryId, schemaVersion: 1, rulesVersion: 1,
      context: { environment: 'park', timeOfDay: 'dusk' }, mood: { primary: 'nostalgic' },
      generation: { mode: 'rules', model: null, fallbackReason: null } });
    expect(manifest.title).toBe('Remembering trees by the river');
    const { start, end } = manifest.artifacts[1].excerpt!;
    expect(bundle.entryText).toBe(draft.entryText);
    expect(bundle.entryText.slice(start, end)).toBe('I remembered the trees by the river at dusk.');
    expect(manifest.artifacts[0].id).not.toBe(manifest.artifacts[1].id);
    expect(bundle.rights).toEqual(draft.rights);
    const viewer = createViewerProps(bundle, () => {});
    expect(await viewer.resolveAsset(manifest.source.photoIds[0])).toBe(draft.photos[0].blob);
    expect(await viewer.resolveAsset(manifest.source.audioId)).toBe(draft.audio.blob);
  });

  it('changes the corresponding parts of the scene when text, photo, or audio changes', async () => {
    const draft = makeDraft();
    const baseline = (await generateMemory(draft)).manifest;
    const newText = (await generateMemory({ ...draft,
      entryText: 'I felt anxious at the station in the morning.' })).manifest;
    expect(newText.context).toEqual({ environment: 'city', timeOfDay: 'day' });
    expect(newText.mood.primary).toBe('tense');
    expect(newText.artifacts[0].kind).not.toBe(baseline.artifacts[0].kind);
    expect(newText.title).not.toBe(baseline.title);
    expect(newText.seed).not.toBe(baseline.seed);

    const changedPhoto = new Blob(['another photo'], { type: 'image/png' });
    const originalPhoto = await analyzePhoto(draft.photos[0].blob);
    vi.mocked(analyzePhoto).mockImplementation(async (blob) => blob === changedPhoto
      ? { ...originalPhoto, palette: [[255, 1, 1], [4, 5, 6], [7, 8, 9]] } : originalPhoto);
    const newPhoto = (await generateMemory({ ...draft, photos: [{ ...draft.photos[0], blob: changedPhoto }] })).manifest;
    expect(newPhoto.presentation.parameters.accentPalette).not.toEqual(baseline.presentation.parameters.accentPalette);
    expect(newPhoto.music).toEqual(baseline.music);

    const tone = createTestTone(220, 0.5);
    const newAudio = (await generateMemory({ ...draft, audio: { ...draft.audio, ...tone } })).manifest;
    expect(newAudio.presentation.parameters.motionSpeed).toBeGreaterThan(baseline.presentation.parameters.motionSpeed);
    expect(newAudio.photos).toEqual(baseline.photos);
  });

  it('builds safe titles from Unicode text, including a dated fallback for entries without usable words', async () => {
    const draft = makeDraft();
    const unicode = (await generateMemory({ ...draft, entryText: '../Café\\снег: 東京 | encore «déjà».' })).manifest;
    expect(unicode.title).toBe('Remembering Café снег 東京 encore');
    expect(memoryTitleSchema.safeParse(unicode.title).success).toBe(true);
    expect(unicode.generation.fallbackReason).toBe('no-keyword-match');
    expect(unicode.mood.primary).toBe('mixed');

    const emoji = '✨🌿'.repeat(12);
    const fallback = (await generateMemory({ ...draft, entryText: emoji })).manifest;
    expect(fallback.title).toBe('Remembering The Day 2026-10-04');
    expect(memoryTitleSchema.safeParse(fallback.title).success).toBe(true);
    expect(fallback.artifacts[1].excerpt).toEqual({ start: 0, end: emoji.length });
  });

  it('rejects an assembled bundle with invalid source or rights records', async () => {
    const draft = makeDraft();
    await expect(generateMemory({ ...draft, rights: [draft.rights[0], draft.rights[0]] })).rejects.toThrow();
  });
});

it('measures silence, in-phase stereo energy, and a partial final audio window', () => {
  const left = new Float32Array(1050);
  left.fill(0.125, 1000);
  const right = left.slice();
  const samples = {
    duration: 1.05, sampleRate: 1000, length: left.length, numberOfChannels: 2,
    getChannelData: (index: number) => [left, right][index],
  } as AudioBuffer;
  expect(measureAudioBuffer(samples)).toEqual({ durationSec: 1.05, sampleStepSec: 0.1,
    energyEnvelope: [...Array<number>(10).fill(0), 0.5], meanEnergy: 0.5 / 11,
    bpm: null, key: null, provenance: 'measured' });
});
