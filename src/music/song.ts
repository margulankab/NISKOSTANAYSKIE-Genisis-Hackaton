import { z } from 'zod';

/**
 * Song of the day: the player's own song, kept as a link to their music app and an optional
 * description. Nothing here performs a network request or embeds a third-party player. The game
 * links out to the service when the player asks, and uses only the description, tempo and year
 * to shape the world's atmosphere and the cleared in-game score (see AGENTS.md on Spotify policy).
 */
export const SONG_VERSION = 1;

export const musicServices = {
  spotify: { name: 'Spotify', search: (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
  'apple-music': { name: 'Apple Music', search: (q: string) => `https://music.apple.com/search?term=${encodeURIComponent(q)}` },
  'youtube-music': { name: 'YouTube Music', search: (q: string) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
  'yandex-music': { name: 'Yandex Music', search: (q: string) => `https://music.yandex.ru/search?text=${encodeURIComponent(q)}` },
  youtube: { name: 'YouTube', search: (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  soundcloud: { name: 'SoundCloud', search: (q: string) => `https://soundcloud.com/search?q=${encodeURIComponent(q)}` },
  deezer: { name: 'Deezer', search: (q: string) => `https://www.deezer.com/search/${encodeURIComponent(q)}` },
  tidal: { name: 'TIDAL', search: (q: string) => `https://listen.tidal.com/search?q=${encodeURIComponent(q)}` },
  bandcamp: { name: 'Bandcamp', search: (q: string) => `https://bandcamp.com/search?q=${encodeURIComponent(q)}` },
  'vk-music': { name: 'VK Music', search: (q: string) => `https://vk.com/audio?q=${encodeURIComponent(q)}` },
} as const;
export type MusicService = keyof typeof musicServices;
export const serviceIds = Object.keys(musicServices) as MusicService[];
/** Services offered as "find it in…" buttons when the player only describes the song. */
export const searchServices: readonly MusicService[] = ['spotify', 'apple-music', 'youtube-music', 'yandex-music'];

export const songGenres = {
  pop: 'Pop', rock: 'Rock', indie: 'Indie', electronic: 'Electronic', 'hip-hop': 'Hip-hop', jazz: 'Jazz',
  classical: 'Classical', folk: 'Folk or acoustic', ambient: 'Ambient', 'lo-fi': 'Lo-fi', rnb: 'R&B or soul',
  metal: 'Metal', soundtrack: 'Film or game score', other: 'Something else',
} as const;
export type SongGenre = keyof typeof songGenres;
const genreIds = Object.keys(songGenres) as [SongGenre, ...SongGenre[]];
const linkKinds = ['track', 'album', 'playlist', 'artist', 'video', 'other'] as const;
export type LinkKind = (typeof linkKinds)[number];

const LINK_MAX = 300;
/** Share parameters that identify the person who shared the link; removed before saving. */
const trackingParams = /^(si|utm_[a-z]+|feature|context|ref|fbclid|gclid|igshid|pp|nd|utm|share|from|go)$/i;

function serviceFor(host: string, path: string): MusicService | null {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (h === 'open.spotify.com' || h === 'spotify.link') return 'spotify';
  if (h === 'music.apple.com' || h === 'itunes.apple.com') return 'apple-music';
  if (h === 'music.youtube.com') return 'youtube-music';
  if (['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'].includes(h)) return 'youtube';
  if (/^music\.yandex\.(ru|com|kz|by|uz)$/.test(h)) return 'yandex-music';
  if (['soundcloud.com', 'm.soundcloud.com', 'on.soundcloud.com'].includes(h)) return 'soundcloud';
  if (['www.deezer.com', 'deezer.com', 'link.deezer.com', 'deezer.page.link'].includes(h)) return 'deezer';
  if (['tidal.com', 'listen.tidal.com', 'www.tidal.com'].includes(h)) return 'tidal';
  if (h === 'bandcamp.com' || /^[a-z0-9-]{1,63}\.bandcamp\.com$/.test(h)) return 'bandcamp';
  if (['vk.com', 'm.vk.com', 'vk.ru'].includes(h) && /^\/(audio|music)/.test(path)) return 'vk-music';
  return null;
}

function kindFor(service: MusicService, url: URL): LinkKind {
  const p = url.pathname.toLowerCase();
  const has = (segment: string) => p.split('/').includes(segment);
  switch (service) {
    case 'spotify': return has('track') ? 'track' : has('album') ? 'album' : has('playlist') ? 'playlist' : has('artist') ? 'artist' : 'other';
    case 'apple-music': return url.searchParams.has('i') || has('song') ? 'track' : has('album') ? 'album' : has('playlist') ? 'playlist' : has('artist') ? 'artist' : 'other';
    case 'youtube-music': return p === '/watch' ? 'track' : p === '/playlist' ? 'playlist' : has('channel') ? 'artist' : 'other';
    case 'youtube': return p === '/watch' || url.hostname === 'youtu.be' || has('shorts') ? 'video' : p === '/playlist' ? 'playlist' : 'other';
    case 'yandex-music': return has('track') ? 'track' : has('playlists') ? 'playlist' : has('album') ? 'album' : has('artist') ? 'artist' : 'other';
    case 'soundcloud': return has('sets') ? 'playlist' : p.split('/').filter(Boolean).length === 2 ? 'track' : 'other';
    case 'deezer': case 'tidal': return has('track') ? 'track' : has('album') ? 'album' : has('playlist') ? 'playlist' : has('artist') ? 'artist' : 'other';
    case 'bandcamp': return has('track') ? 'track' : has('album') ? 'album' : 'other';
    case 'vk-music': return p.startsWith('/audio') ? 'track' : has('playlist') || has('album') ? 'playlist' : 'other';
  }
}

export type SongLink = { service: MusicService; url: string; kind: LinkKind };
export type ParsedLink = { ok: true; link: SongLink } | { ok: false; reason: string };

/** Recognize a link from a music app. Only exact, known hosts over HTTPS are accepted. */
export function parseSongLink(input: string): ParsedLink {
  const text = input.trim();
  if (!text) return { ok: false, reason: 'Paste a link to the song.' };
  if (text.length > LINK_MAX) return { ok: false, reason: 'This link is too long to be a song link.' };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: 'This is not a web link. Copy it with your music app’s Share → Copy link.' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'Only web links to music apps are supported.' };
  if (url.username || url.password || url.port) return { ok: false, reason: 'This link contains login details or a port. Copy the plain share link.' };
  const service = serviceFor(url.hostname, url.pathname.toLowerCase());
  if (!service) return { ok: false, reason: 'This link is not from a supported music app.' };
  url.protocol = 'https:';
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (trackingParams.test(key)) url.searchParams.delete(key);
  const clean = url.toString();
  if (clean.length > LINK_MAX) return { ok: false, reason: 'This link is too long to be a song link.' };
  return { ok: true, link: { service, url: clean, kind: kindFor(service, url) } };
}

const plainText = (max: number) => z.string().trim().min(1).max(max).refine((s) => !/[<>]/.test(s), 'Use plain text.');
const linkSchema = z.strictObject({
  service: z.enum(serviceIds as [MusicService, ...MusicService[]]),
  url: z.string().max(LINK_MAX),
  kind: z.enum(linkKinds),
}).refine((link) => {
  const parsed = parseSongLink(link.url);
  return parsed.ok && parsed.link.url === link.url && parsed.link.service === link.service;
}, 'The song link is not a recognized music app link.');

export const songSchema = z.strictObject({
  version: z.literal(SONG_VERSION),
  link: linkSchema.optional(),
  artist: plainText(80).optional(),
  title: plainText(120).optional(),
  genre: z.enum(genreIds).optional(),
  year: z.int().min(1900).max(2100).optional(),
  bpm: z.int().min(40).max(220).optional(),
}).refine((song) => Boolean(song.link || song.artist || song.title || song.genre || song.year || song.bpm),
  'Add a link or describe the song.');
export type Song = z.infer<typeof songSchema>;

/** Draft values from the form; returns a valid song or null when nothing was entered. */
export function buildSong(draft: { link?: SongLink | null; artist?: string; title?: string; genre?: string; year?: string | number; bpm?: number | null }): Song | null {
  const year = typeof draft.year === 'number' ? draft.year : draft.year?.trim() ? Number(draft.year) : undefined;
  const candidate = {
    version: SONG_VERSION,
    ...(draft.link && { link: draft.link }),
    ...(draft.artist?.trim() && { artist: draft.artist.trim() }),
    ...(draft.title?.trim() && { title: draft.title.trim() }),
    ...(draft.genre && draft.genre in songGenres && { genre: draft.genre }),
    ...(year !== undefined && Number.isInteger(year) && { year }),
    ...(draft.bpm && { bpm: Math.round(draft.bpm) }),
  };
  const parsed = songSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function songLabel(song: Song): string {
  if (song.artist && song.title) return `${song.artist} — ${song.title}`;
  return song.title ?? song.artist ?? (song.link ? `${musicServices[song.link.service].name} ${song.link.kind === 'other' ? 'link' : song.link.kind}` : 'Song of the day');
}

/** Links shown to the player: the saved link, or searches built from the description. */
export function songLinks(song: Song): { service: MusicService; label: string; href: string }[] {
  if (song.link) return [{ service: song.link.service, label: `Open in ${musicServices[song.link.service].name}`, href: song.link.url }];
  const query = [song.artist, song.title].filter(Boolean).join(' ');
  if (!query) return [];
  return searchServices.map((service) => ({ service, label: `Find in ${musicServices[service].name}`, href: musicServices[service].search(query) }));
}

const genreCues: Record<SongGenre, { mood: string[]; energy: string[]; tempo: number }> = {
  pop: { mood: ['joyful'], energy: ['bright'], tempo: 116 },
  rock: { mood: ['lively'], energy: ['high'], tempo: 124 },
  indie: { mood: ['nostalgic'], energy: ['gentle'], tempo: 104 },
  electronic: { mood: ['lively'], energy: ['high', 'bright'], tempo: 126 },
  'hip-hop': { mood: ['lively'], energy: ['bright'], tempo: 92 },
  jazz: { mood: ['nostalgic'], energy: ['gentle'], tempo: 96 },
  classical: { mood: ['calm'], energy: ['gentle'], tempo: 80 },
  folk: { mood: ['peaceful'], energy: ['gentle'], tempo: 90 },
  ambient: { mood: ['calm'], energy: ['low'], tempo: 70 },
  'lo-fi': { mood: ['subdued'], energy: ['low'], tempo: 78 },
  rnb: { mood: ['calm'], energy: ['gentle'], tempo: 88 },
  metal: { mood: ['tense'], energy: ['high'], tempo: 140 },
  soundtrack: { mood: ['nostalgic'], energy: ['subdued'], tempo: 84 },
  other: { mood: [], energy: [], tempo: 100 },
};

/** Soundtrack cues and a 0–1 energy derived only from what the player told us about the song. */
export function songCues(song: Song | undefined | null): { mood: string[]; energy: string[]; tempo: number; energyLevel: number; reasons: string[] } {
  const mood: string[] = [], energy: string[] = [], reasons: string[] = [];
  if (!song) return { mood, energy, tempo: 100, energyLevel: 0.5, reasons };
  const genre = song.genre ? genreCues[song.genre] : null;
  if (genre && song.genre !== 'other') {
    mood.push(...genre.mood); energy.push(...genre.energy);
    reasons.push(`${songGenres[song.genre!]} suggests ${[...genre.mood, ...genre.energy].join(' and ')}`);
  }
  const tempo = song.bpm ?? genre?.tempo ?? 100;
  if (song.bpm && song.bpm >= 118) { energy.push('high', 'bright'); reasons.push(`${song.bpm} BPM is fast`); }
  if (song.bpm && song.bpm <= 86) { energy.push('low', 'gentle'); reasons.push(`${song.bpm} BPM is slow`); }
  if (song.year && song.year < 1995) { mood.push('nostalgic'); reasons.push(`${song.year} reads as nostalgic`); }
  const energyLevel = Math.min(1, Math.max(0, (tempo - 60) / 100));
  return { mood: [...new Set(mood)], energy: [...new Set(energy)], tempo, energyLevel, reasons };
}

/** Tempo from tap times in milliseconds. Uses the median gap of the most recent run of taps. */
export function bpmFromTaps(times: readonly number[]): number | null {
  const run: number[] = [];
  for (let i = times.length - 1; i > 0; i--) {
    const gap = times[i] - times[i - 1];
    if (gap <= 0 || gap > 2000) break;
    run.push(gap);
    if (run.length === 8) break;
  }
  if (run.length < 3) return null;
  const sorted = [...run].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const bpm = Math.round(60000 / median);
  return bpm >= 40 && bpm <= 220 ? bpm : null;
}
