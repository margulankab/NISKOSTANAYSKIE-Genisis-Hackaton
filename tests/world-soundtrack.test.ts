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
  expect(new Set(soundtrackCatalog.map(({ id }) => id)).size).toBe(15);
});

test('a described song steers the choice toward the matching new compositions', () => {
  expect(selectWorldSoundtrack({ mood: ['nostalgic', 'peaceful'], energy: ['gentle'] }).record)
    .toMatchObject({ trackId: 'warm-tape' });
  expect(selectWorldSoundtrack({ mood: ['lively'], setting: ['night'], energy: ['high', 'bright'] }).record)
    .toMatchObject({ trackId: 'night-drive' });
});

test('specific scenes reach the specialised tracks, and every track renders', () => {
  const pick = (cues: Parameters<typeof selectWorldSoundtrack>[0]) => {
    const { record } = selectWorldSoundtrack(cues);
    return record.kind === 'catalog' ? record.trackId : record.kind;
  };
  expect(pick({ mood: ['joyful'], setting: ['ballfield'] })).toBe('ballpark-anthem');
  expect(pick({ mood: ['subdued'], setting: ['station'] })).toBe('last-train');
  expect(pick({ mood: ['mourning'], setting: ['funeral'] })).toBe('farewell-waltz');
  expect(pick({ mood: ['nostalgic'], setting: ['rain', 'room'] })).toBe('rain-window');
  expect(pick({ setting: ['water-park'], energy: ['high'] })).toBe('summer-splash');
  expect(pick({ mood: ['joyful'], setting: ['party', 'gathering'] })).toBe('festival-lights');
  expect(pick({ setting: ['snow'], energy: ['low'] })).toBe('snow-hush');
  expect(pick({ mood: ['curious'], setting: ['forest'] })).toBe('deep-woods');
  for (const { id } of soundtrackCatalog) {
    const { blob, record } = createCatalogSoundtrack(id);
    expect(blob?.size).toBeGreaterThan(1000);
    if (record.kind === 'silent') throw new Error('Expected a playable track');
    expect(record.music.meanEnergy).toBeGreaterThan(0);
  }
});
