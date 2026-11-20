import type { SpotifyRef } from './types';

/** Accepts open.spotify.com URLs and spotify: URIs only. Never fetches anything. */
export function parseSpotify(input: string): SpotifyRef | null {
  const s = input.trim();
  const uri = s.match(/^spotify:(track|episode|album|playlist):([A-Za-z0-9]{22})$/);
  if (uri) return { kind: uri[1] as SpotifyRef['kind'], id: uri[2], url: `https://open.spotify.com/${uri[1]}/${uri[2]}` };
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'open.spotify.com') return null;
  const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|episode|album|playlist)\/([A-Za-z0-9]{22})\/?$/);
  return m ? { kind: m[1] as SpotifyRef['kind'], id: m[2], url: `https://open.spotify.com/${m[1]}/${m[2]}` } : null;
}
export const embedUrl = (r: SpotifyRef) => `https://open.spotify.com/embed/${r.kind}/${r.id}`;
