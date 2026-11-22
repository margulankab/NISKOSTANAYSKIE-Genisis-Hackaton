import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '../i18n/i18n';
import { embedFor } from './embed';
import { closeMiniPlayer, openMusicPicker, playInMiniPlayer, useNowPlaying, usePickerOpen } from './player-store';
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
 * Pick music from a real app: search opens the app in a new tab; a pasted link plays here in the app's
 * own player. Nothing loads from the app until the player presses Play here.
 */
export function MusicPicker({ song, onPlayed }: { song?: Song | null; onPlayed?: () => void }) {
  const t = useT();
  const id = useId();
  const [app, setApp] = useState<MusicService>(song?.link?.service && apps.some((a) => a.id === song.link?.service) ? song.link.service : 'spotify');
  const [query, setQuery] = useState(song ? songLabel(song) : '');
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const name = musicServices[app].name;

  function play(text: string, label?: string) {
    const parsed = parseSongLink(text);
    if (!parsed.ok) { setError(parsed.reason); return; }
    const embed = embedFor(parsed.link);
    if (!embed) { setError(t('{app} does not offer a player for this kind of link. Open it in the app instead.', { app: musicServices[parsed.link.service].name })); return; }
    setError(null);
    playInMiniPlayer({ link: parsed.link, embed, label: label ?? musicServices[parsed.link.service].name });
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
      {song?.link && embedFor(song.link) && (
        <button type="button" className="music-day-song" onClick={() => play(song.link!.url, songLabel(song) || t('Song of the day'))}>
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
      <form className="music-link" onSubmit={(event) => { event.preventDefault(); play(link.trim()); }}>
        <label htmlFor={`${id}-l`}>{t('Paste a link to play it here')}</label>
        <div className="music-row">
          <input id={`${id}-l`} type="url" inputMode="url" value={link} spellCheck={false} autoComplete="off"
            placeholder={app === 'spotify' ? 'https://open.spotify.com/track/…' : app === 'soundcloud' ? 'https://soundcloud.com/…'
              : app === 'apple-music' ? 'https://music.apple.com/…' : 'https://music.youtube.com/watch?v=…'}
            onChange={(event) => { setLink(event.target.value); setError(null); }} aria-invalid={Boolean(error)} />
          <button type="submit" className="music-play" disabled={!link.trim()}>▶ {t('Play here')}</button>
        </div>
      </form>
      {error && <p role="alert" className="music-error">{error}</p>}
      <p className="field-hint">{t('Plays in the app’s own player, which loads from that app only when you press Play here. The game’s score pauses while it plays.')}</p>
    </div>
  );
}

/** Floating player card. It stays on screen (collapsible) so music keeps playing between screens. */
export function MiniPlayer() {
  const t = useT();
  const now = useNowPlaying();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (now) setCollapsed(false); }, [now]);
  if (!now) return null;
  return (
    <aside className={`mini-player${collapsed ? ' is-collapsed' : ''}`} aria-label={t('Music player')} key={now.embed.src}>
      <div className="mini-player-head">
        <span className={`mini-player-badge service-${now.link.service}`}>{musicServices[now.link.service].name}</span>
        <span className="mini-player-title">{now.label}</span>
        <button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? t('Show player') : t('Hide player')}>
          {collapsed ? '▴' : '▾'}
        </button>
        <a href={now.link.url} target="_blank" rel="noopener noreferrer" aria-label={t('Open in {app}', { app: musicServices[now.link.service].name })}>↗</a>
        <button type="button" onClick={closeMiniPlayer} aria-label={t('Close player')}>✕</button>
      </div>
      <iframe title={t('{app} player', { app: musicServices[now.link.service].name })} src={now.embed.src} height={now.embed.height}
        loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
    </aside>
  );
}

/** Header button: opens the picker from anywhere on the site. */
export function MusicButton() {
  const t = useT();
  const open = usePickerOpen();
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
