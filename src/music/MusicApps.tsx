import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '../i18n/i18n';
import { musicServices, parseSongLink, songLabel } from './song';
import type { MusicService, Song } from './song';

/** The apps offered in the picker, with their own colours for the tab marker. */
const apps: { id: MusicService; mark: string }[] = [
  { id: 'spotify', mark: '#1ed760' },
  { id: 'soundcloud', mark: '#ff7a2f' },
  { id: 'apple-music', mark: '#fa4d6a' },
  { id: 'youtube-music', mark: '#ff3b3b' },
];

/**
 * Search for a song or open a validated link in the provider’s
 * own app.
 */
export function MusicPicker({ song, onPlayed }: { song?: Song | null; onPlayed?: () => void }) {
  const t = useT();
  const id = useId();
  const [app, setApp] = useState<MusicService>(song?.link?.service && apps.some((a) => a.id === song.link?.service) ? song.link.service : 'spotify');
  const [query, setQuery] = useState(song ? songLabel(song) : '');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const name = musicServices[app].name;

  function openLink(text: string) {
    const parsed = parseSongLink(text);
    if (!parsed.ok) { setError(parsed.reason); return; }
    window.open(parsed.link.url, '_blank', 'noopener,noreferrer');
    setError(null);
    onPlayed?.();
  }

  return (
    <div className="music-picker">
      <div className="music-apps" role="tablist" aria-label={t('Music app')}>
        {apps.map(({ id: service, mark }) => (
          <button key={service} type="button" role="tab" aria-selected={app === service} style={{ '--mark': mark } as React.CSSProperties}
            onClick={() => { setApp(service); setError(null); }}>
            <span className="music-app-dot" aria-hidden="true" />{musicServices[service].name}
          </button>
        ))}
      </div>
      {song?.link && (
        <button type="button" className="music-day-song" onClick={() => openLink(song.link!.url)}>
          ♫ {t('Play your song of the day')}<small>{songLabel(song) || musicServices[song.link.service].name}</small>
        </button>
      )}
      <form className="music-search" onSubmit={(event) => {
        event.preventDefault();
        if (query.trim()) window.open(musicServices[app].search(query.trim()), '_blank', 'noopener,noreferrer');
      }}>
        <label htmlFor={`${id}-q`}>{t('Find music in {app}', { app: name })}</label>
        <div className="music-row">
          <input id={`${id}-q`} value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} placeholder={t('Artist or song')} autoComplete="off" />
          <button type="submit" disabled={!query.trim()}>{t('Search')} ↗</button>
        </div>
      </form>
      <form className="music-link" onSubmit={(event) => { event.preventDefault(); openLink(link.trim()); }}>
        <label htmlFor={`${id}-l`}>{t('Music app link')}</label>
        <div className="music-row">
          <input id={`${id}-l`} type="url" inputMode="url" value={link} spellCheck={false} autoComplete="off"
            placeholder={app === 'spotify' ? 'https://open.spotify.com/track/…' : app === 'soundcloud' ? 'https://soundcloud.com/…'
              : app === 'apple-music' ? 'https://music.apple.com/…' : 'https://music.youtube.com/watch?v=…'}
            onChange={(event) => { setLink(event.target.value); setError(null); }} aria-invalid={Boolean(error)} />
          <button type="submit" className="music-play" disabled={!link.trim()}>{t('Open in app')}</button>
        </div>
      </form>
      {error && <p role="alert" className="music-error">{error}</p>}
      <p className="field-hint">{t('Music links open in a separate tab.')}</p>
    </div>
  );
}

/** Header button: opens the picker from anywhere on the site. */
export function MusicButton() {
  const t = useT();
  const [open, openMusicPicker] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !box.current?.contains(event.target as Node)) openMusicPicker(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  return (
    <div className="music-button" ref={box}>
      <button type="button" className="view-button music-toggle" aria-expanded={open} onClick={() => openMusicPicker(!open)}>♫ {t('Music')}</button>
      {open && (
        <div className="music-popover" role="dialog" aria-label={t('Music apps')}>
          <MusicPicker onPlayed={() => openMusicPicker(false)} />
        </div>
      )}
    </div>
  );
}
