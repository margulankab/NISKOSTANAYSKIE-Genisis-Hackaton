import { describe, expect, it } from 'vitest';
import { bpmFromTaps, buildSong, parseSongLink, songCues, songLinks, songSchema } from '../src/music/song';

describe('music app links', () => {
  it.each([
    ['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc123', 'spotify', 'track', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'],
    ['https://open.spotify.com/intl-ru/album/1A2B3C?si=x&utm_source=copy', 'spotify', 'album', 'https://open.spotify.com/intl-ru/album/1A2B3C'],
    ['https://music.apple.com/us/album/fly-me-to-the-moon/1440856963?i=1440857171', 'apple-music', 'track', undefined],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking', 'youtube-music', 'track', 'https://music.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['youtu.be/dQw4w9WgXcQ?si=abc', 'youtube', 'video', 'https://youtu.be/dQw4w9WgXcQ'],
    ['https://music.yandex.ru/album/123/track/456', 'yandex-music', 'track', undefined],
    ['https://soundcloud.com/artist-name/song-name', 'soundcloud', 'track', undefined],
    ['https://soundcloud.com/artist-name/sets/summer', 'soundcloud', 'playlist', undefined],
    ['https://www.deezer.com/en/track/3135556', 'deezer', 'track', undefined],
    ['https://listen.tidal.com/track/77646168', 'tidal', 'track', undefined],
    ['https://someband.bandcamp.com/track/night-drive', 'bandcamp', 'track', undefined],
    ['https://vk.com/audio-2001_123', 'vk-music', 'track', undefined],
  ])('recognizes %s', (input, service, kind, clean) => {
    const parsed = parseSongLink(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.link.service).toBe(service);
    expect(parsed.link.kind).toBe(kind);
    if (clean) expect(parsed.link.url).toBe(clean);
    expect(parsed.link.url.startsWith('https://')).toBe(true);
  });

  it.each([
    ['', 'Paste'],
    ['not a link at all', 'not a web link'],
    ['javascript:alert(1)', 'web links'],
    ['https://open.spotify.com.evil.example/track/1', 'supported'],
    ['https://evil.example/?u=open.spotify.com', 'supported'],
    ['https://user:pass@open.spotify.com/track/1', 'login'],
    ['https://vk.com/id123', 'supported'],
    ['https://open.spotify.com/track/' + 'a'.repeat(400), 'too long'],
  ])('rejects %s', (input, reason) => {
    const parsed = parseSongLink(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toContain(reason);
  });
});

describe('song of the day', () => {
  it('builds only when the player entered something and strips markup', () => {
    expect(buildSong({})).toBeNull();
    expect(buildSong({ artist: '   ' })).toBeNull();
    expect(buildSong({ artist: '<b>x</b>' })).toBeNull();
    const song = buildSong({ artist: 'Frank Sinatra', title: 'Fly Me to the Moon', genre: 'jazz', year: '1964', bpm: 119.6 });
    expect(song).toEqual({ version: 1, artist: 'Frank Sinatra', title: 'Fly Me to the Moon', genre: 'jazz', year: 1964, bpm: 120 });
  });

  it('rejects a saved link that no longer matches its service', () => {
    const forged = { version: 1, link: { service: 'spotify', url: 'https://evil.example/track/1', kind: 'track' } };
    expect(songSchema.safeParse(forged).success).toBe(false);
    const mislabeled = { version: 1, link: { service: 'deezer', url: 'https://open.spotify.com/track/1', kind: 'track' } };
    expect(songSchema.safeParse(mislabeled).success).toBe(false);
  });

  it('links out to the saved app, or offers searches built from the description', () => {
    const parsed = parseSongLink('https://open.spotify.com/track/abc?si=1');
    if (!parsed.ok) throw new Error('expected link');
    expect(songLinks(buildSong({ link: parsed.link })!)).toEqual([
      { service: 'spotify', label: 'Open in Spotify', href: 'https://open.spotify.com/track/abc' },
    ]);
    const described = songLinks(buildSong({ artist: 'Кино', title: 'Звезда по имени Солнце' })!);
    expect(described.map(l => l.service)).toEqual(['spotify', 'apple-music', 'youtube-music', 'yandex-music']);
    expect(described[3].href).toContain(encodeURIComponent('Кино Звезда по имени Солнце'));
    expect(songLinks(buildSong({ genre: 'jazz' })!)).toEqual([]);
  });

  it('turns genre, tempo and year into explainable soundtrack cues', () => {
    const slowOld = songCues(buildSong({ genre: 'jazz', year: 1964, bpm: 72 }));
    expect(slowOld.mood).toEqual(expect.arrayContaining(['nostalgic']));
    expect(slowOld.energy).toEqual(expect.arrayContaining(['low', 'gentle']));
    expect(slowOld.reasons.length).toBe(3);
    const fast = songCues(buildSong({ genre: 'electronic', bpm: 128 }));
    expect(fast.energy).toEqual(expect.arrayContaining(['high', 'bright']));
    expect(fast.energyLevel).toBeGreaterThan(slowOld.energyLevel);
    expect(songCues(null)).toMatchObject({ mood: [], energy: [], energyLevel: 0.5 });
  });
});

describe('tap tempo', () => {
  const taps = (gap: number, count: number, start = 1000) => Array.from({ length: count }, (_, i) => start + i * gap);
  it('measures steady taps', () => {
    expect(bpmFromTaps(taps(500, 6))).toBe(120);
    expect(bpmFromTaps(taps(750, 5))).toBe(80);
  });
  it('needs at least four taps and ignores a long pause before the latest run', () => {
    expect(bpmFromTaps(taps(500, 3))).toBeNull();
    expect(bpmFromTaps([...taps(300, 5), ...taps(600, 5, 10_000)])).toBe(100);
  });
  it('resists one sloppy tap and rejects impossible tempos', () => {
    expect(bpmFromTaps([0, 500, 1000, 1700, 2200, 2700])).toBe(120);
    expect(bpmFromTaps(taps(100, 6))).toBeNull();
  });
});

describe('song-led soundtrack choice', async () => {
  const { promptSoundtrack } = await import('../src/world/prompt-soundtrack');
  const { composeSceneTemplate } = await import('../src/world/compose-scene-template');
  const built = composeSceneTemplate('An autumn park at dusk with a bench, a lamp and a pond.', { id: '0f8fad5b-d9cb-469f-a165-70867728950e' });
  if (!built.ok) throw new Error(built.reason);
  it('lets the player’s song outrank the park’s generic cues', () => {
    const plain = promptSoundtrack(built.world);
    const jazz = promptSoundtrack({ ...built.world, song: buildSong({ genre: 'jazz', year: 1964 })! });
    const techno = promptSoundtrack({ ...built.world, song: buildSong({ genre: 'electronic', bpm: 128 })! });
    expect(jazz.record).toMatchObject({ trackId: 'warm-tape' });
    // A fast electronic song moves the choice to one of the energetic tracks.
    expect(['lantern-market', 'night-drive']).toContain(techno.record.kind === 'catalog' ? techno.record.trackId : '');
    if (techno.record.kind !== 'silent' && jazz.record.kind !== 'silent') {
      expect(techno.record.music.meanEnergy).toBeGreaterThan(jazz.record.music.meanEnergy);
    }
    expect(plain.record.kind).toBe('catalog');
    if (jazz.record.kind !== 'silent') expect(jazz.record.reason).toContain('nostalgic');
  });
});
