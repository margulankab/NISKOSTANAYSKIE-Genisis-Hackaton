import { describe, expect, it } from 'vitest';
import { embedFor } from '../src/music/embed';
import { parseSongLink } from '../src/music/song';

const embed = (link: string) => {
  const parsed = parseSongLink(link);
  if (!parsed.ok) throw new Error(parsed.reason);
  return embedFor(parsed.link)?.src ?? null;
};

describe('official music-app players', () => {
  it.each([
    ['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc', 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC'],
    ['https://open.spotify.com/intl-ru/playlist/37i9dQZF1DXcBWIGoYBM5M', 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M'],
    ['https://music.apple.com/us/album/fly-me-to-the-moon/1440856963?i=1440857171', 'https://embed.music.apple.com/us/album/fly-me-to-the-moon/1440856963?i=1440857171'],
    ['https://soundcloud.com/artist-name/track-name', 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist-name%2Ftrack-name&color=%239be14b&visual=false&show_comments=false'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://www.deezer.com/en/track/3135556', 'https://widget.deezer.com/widget/dark/track/3135556'],
    ['https://music.yandex.ru/album/123/track/456', 'https://music.yandex.ru/iframe/#track/456/123'],
  ])('%s', (link, expected) => {
    expect(embed(link)).toBe(expected);
  });

  it('returns no player for links without a public embed', () => {
    expect(embed('https://open.spotify.com/search/jazz')).toBeNull();
    expect(embed('https://bandcamp.com/album/x')).toBeNull();
  });
});
