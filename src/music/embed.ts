import type { SongLink } from './song';

/** An official embedded player for a music-app link: the provider's own widget, loaded only on request. */
export interface Embed { src: string; height: number; origin: string }

const id = /^[A-Za-z0-9_-]{1,64}$/;
const after = (parts: string[], key: string) => {
  const index = parts.indexOf(key);
  const value = index >= 0 ? parts[index + 1] : undefined;
  return value && id.test(value) ? value : undefined;
};

/** The provider's embed URL for a parsed link, or null when the app has no public player for it. */
export function embedFor(link: SongLink): Embed | null {
  const url = new URL(link.url);
  const parts = url.pathname.split('/').filter(Boolean);
  switch (link.service) {
    case 'spotify': {
      for (const type of ['track', 'album', 'playlist', 'episode', 'show', 'artist']) {
        const value = after(parts, type);
        if (value) return { src: `https://open.spotify.com/embed/${type}/${value}`, height: type === 'track' || type === 'episode' ? 152 : 352, origin: 'https://open.spotify.com' };
      }
      return null;
    }
    case 'apple-music': {
      if (!/^(album|playlist|song|station)$/.test(parts[1] ?? '') || !/^[a-z]{2}$/.test(parts[0] ?? '')) return null;
      const track = url.searchParams.get('i');
      const src = `https://embed.music.apple.com${url.pathname}${track && /^\d+$/.test(track) ? `?i=${track}` : ''}`;
      return { src, height: link.kind === 'track' ? 175 : 450, origin: 'https://embed.music.apple.com' };
    }
    case 'soundcloud': {
      if (url.hostname === 'on.soundcloud.com' || parts.length < 2) return null;
      const clean = `https://soundcloud.com/${parts.join('/')}`;
      return {
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&color=%239be14b&visual=false&show_comments=false`,
        height: link.kind === 'playlist' ? 300 : 166, origin: 'https://w.soundcloud.com',
      };
    }
    case 'youtube':
    case 'youtube-music': {
      const list = url.searchParams.get('list');
      const video = url.hostname === 'youtu.be' ? parts[0] : parts[0] === 'shorts' ? parts[1] : url.searchParams.get('v');
      if (video && id.test(video)) return { src: `https://www.youtube-nocookie.com/embed/${video}`, height: 220, origin: 'https://www.youtube-nocookie.com' };
      if (list && id.test(list)) return { src: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`, height: 220, origin: 'https://www.youtube-nocookie.com' };
      return null;
    }
    case 'deezer': {
      for (const type of ['track', 'album', 'playlist']) {
        const value = after(parts, type);
        if (value) return { src: `https://widget.deezer.com/widget/dark/${type}/${value}`, height: type === 'track' ? 150 : 300, origin: 'https://widget.deezer.com' };
      }
      return null;
    }
    case 'yandex-music': {
      const album = after(parts, 'album');
      const track = after(parts, 'track');
      if (album && track) return { src: `https://music.yandex.ru/iframe/#track/${track}/${album}`, height: 180, origin: 'https://music.yandex.ru' };
      if (album) return { src: `https://music.yandex.ru/iframe/#album/${album}`, height: 450, origin: 'https://music.yandex.ru' };
      return null;
    }
    case 'tidal': {
      for (const [type, path] of [['track', 'tracks'], ['album', 'albums'], ['playlist', 'playlists']] as const) {
        const value = after(parts, type);
        if (value) return { src: `https://embed.tidal.com/${path}/${value}`, height: type === 'track' ? 120 : 400, origin: 'https://embed.tidal.com' };
      }
      return null;
    }
    default:
      return null;
  }
}
