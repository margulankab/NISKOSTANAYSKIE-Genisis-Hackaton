import { expect, test } from 'vitest';
import { createCatalogSoundtrack, selectWorldSoundtrack, soundtrackCatalog } from '../src/media/world-soundtrack';

test('contrasting cues select cleared compositions and explain the normalized matches', async () => {
  const cove = selectWorldSoundtrack({ mood: [' CALM '], setting: ['cove'], energy: ['low'] });
  const market = selectWorldSoundtrack({ mood: ['lively'], setting: ['market'], energy: ['high'] });
  expect(cove.record).toMatchObject({
    kind: 'catalog', trackId: 'coastal-light', reason: 'Matched cues: calm, cove, low.',
    rights: { permission: expect.stringContaining('portable export') },
  });
  expect(market.record).toMatchObject({
    kind: 'catalog', trackId: 'lantern-market', reason: 'Matched cues: lively, market, high.',
  });
  if (cove.record.kind === 'silent' || market.record.kind === 'silent') throw new Error('Expected playable tracks');
  expect(market.record.music.meanEnergy).toBeGreaterThan(cove.record.music.meanEnergy);
  expect(cove.blob?.type).toBe('audio/wav');
  const repeat = createCatalogSoundtrack('coastal-light');
  expect(await repeat.blob?.arrayBuffer()).toEqual(await cove.blob?.arrayBuffer());
  expect(repeat.record).toMatchObject({ assetId: cove.record.assetId, music: cove.record.music });
});

test('ties are stable, repeats have no extra weight, and unavailable or unsuitable tracks stay silent', () => {
  expect(selectWorldSoundtrack({ energy: ['low', 'low'] }).record).toMatchObject({ trackId: 'coastal-light' });
  expect(selectWorldSoundtrack({ energy: ['low'] }, ['still-rooms', 'coastal-light']).record)
    .toMatchObject({ trackId: 'coastal-light' });
  expect(selectWorldSoundtrack({ mood: ['subdued'] }).record).toMatchObject({ trackId: 'still-rooms' });
  expect(selectWorldSoundtrack({ setting: ['city'] }, []).record.kind).toBe('silent');
  expect(selectWorldSoundtrack({ setting: ['spaceship'] }).record.kind).toBe('silent');
  expect(selectWorldSoundtrack({ setting: ['market'] }, ['coastal-light']).record.kind).toBe('silent');
  expect(new Set(soundtrackCatalog.map(({ id }) => id)).size).toBe(3);
});
