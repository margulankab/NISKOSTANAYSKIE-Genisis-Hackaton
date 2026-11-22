import { useEffect, useId, useRef, useState } from 'react';
import { bpmFromTaps, buildSong, musicServices, parseSongLink, songCues, songGenres, songLabel, songLinks } from './song';
import type { Song, SongLink } from './song';
import { useT } from '../i18n/i18n';

/** Song-of-the-day fields: a music-app link, a short description, and an optional tapped tempo. */
export function SongOfTheDay({ value, onChange, legend = 'Song of the day' }: {
  value: Song | null;
  onChange: (song: Song | null) => void;
  legend?: string;
}) {
  const id = useId();
  const [linkText, setLinkText] = useState(value?.link?.url ?? '');
  const [link, setLink] = useState<SongLink | null>(value?.link ?? null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [artist, setArtist] = useState(value?.artist ?? '');
  const [title, setTitle] = useState(value?.title ?? '');
  const [genre, setGenre] = useState<string>(value?.genre ?? '');
  const [year, setYear] = useState(value?.year ? String(value.year) : '');
  const [bpm, setBpm] = useState<number | null>(value?.bpm ?? null);
  const taps = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const reported = useRef<string>(JSON.stringify(value));
  const t = useT();

  useEffect(() => {
    const song = buildSong({ link, artist, title, genre, year, bpm });
    const key = JSON.stringify(song);
    if (key !== reported.current) {
      reported.current = key;
      onChange(song);
    }
  }, [link, artist, title, genre, year, bpm, onChange]);

  function readLink(text: string) {
    setLinkText(text);
    if (!text.trim()) { setLink(null); setLinkError(null); return; }
    const parsed = parseSongLink(text);
    setLink(parsed.ok ? parsed.link : null);
    setLinkError(parsed.ok ? null : parsed.reason);
  }

  function tap(time: number) {
    const last = taps.current.at(-1);
    taps.current = last !== undefined && time - last > 2000 ? [time] : [...taps.current, time].slice(-12);
    setTapCount(taps.current.length);
    const measured = bpmFromTaps(taps.current);
    if (measured) setBpm(measured);
  }

  const song = buildSong({ link, artist, title, genre, year, bpm });
  const cues = songCues(song);
  return (
    <fieldset className="song-of-day">
      <legend>{t(legend)}</legend>
      <p className="field-hint">{t('Optional. Your song keeps playing in your own music app; the world takes its tempo and mood from it.')}</p>
      <label htmlFor={`${id}-link`}>{t('Link from your music app')}</label>
      <input id={`${id}-link`} type="url" inputMode="url" autoComplete="off" spellCheck={false} value={linkText}
        placeholder="https://open.spotify.com/track/…" aria-describedby={`${id}-link-hint`}
        onChange={event => readLink(event.target.value)} aria-invalid={Boolean(linkError)} />
      <p className="field-hint" id={`${id}-link-hint`} role={linkError ? 'alert' : undefined}>
        {linkError ?? (link
          ? t('Recognized: {service} {kind}. Sharing codes are removed before saving.', { service: musicServices[link.service].name, kind: link.kind === 'other' ? 'link' : link.kind })
          : t('Spotify, Apple Music, YouTube Music, Yandex Music, SoundCloud, Deezer, TIDAL, Bandcamp or VK.'))}
      </p>
      <div className="song-fields">
        <label>{t('Artist')}<input value={artist} maxLength={80} onChange={event => setArtist(event.target.value)} autoComplete="off" /></label>
        <label>{t('Song')}<input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} autoComplete="off" /></label>
        <label>{t('Style')}
          <select value={genre} onChange={event => setGenre(event.target.value)}>
            <option value="">{t('Not sure')}</option>
            {Object.entries(songGenres).map(([key, name]) => <option key={key} value={key}>{t(name)}</option>)}
          </select>
        </label>
        <label>{t('Year')}<input value={year} inputMode="numeric" maxLength={4} pattern="\d{4}" onChange={event => setYear(event.target.value.replace(/\D/g, ''))} /></label>
      </div>
      <div className="tap-tempo">
        <button type="button" className="tap-button" onClick={event => tap(event.timeStamp)}
          aria-describedby={`${id}-tap`}>{t('Tap the beat')}</button>
        <p id={`${id}-tap`} aria-live="polite">
          {bpm ? `${bpm} BPM` : tapCount ? t('Keep tapping… {count}', { count: tapCount }) : t('Play the song in your app and tap along four or more times.')}
        </p>
        {bpm && <button type="button" className="link-button" onClick={() => { taps.current = []; setTapCount(0); setBpm(null); }}>{t('Clear tempo')}</button>}
      </div>
      {song && (cues.reasons.length > 0 || songLinks(song).length > 0) && (
        <div className="song-summary">
          {cues.reasons.length > 0 && (
            <ul aria-label={t('How the song shapes the world')}>{cues.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
          )}
          <SongLinks song={song} />
        </div>
      )}
    </fieldset>
  );
}

export function SongLinks({ song }: { song: Song }) {
  const links = songLinks(song);
  if (!links.length) return null;
  return (
    <p className="song-links">
      {links.map(link => (
        <a key={link.service} className={`service-link service-${link.service}`} href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
        </a>
      ))}
    </p>
  );
}

/** Compact card shown while playing: what the song is and where to play it. */
export function SongCard({ song }: { song: Song }) {
  const cues = songCues(song);
  const t = useT();
  return (
    <aside className="song-card" aria-label={t('Song of the day')}>
      <p className="song-card-title">{songLabel(song)}</p>
      <p className="song-card-meta">
        {[song.genre && songGenres[song.genre], song.year, song.bpm && `${song.bpm} BPM`].filter(Boolean).join(', ') || t('Shapes this world')}
        {cues.reasons.length > 0 && <span className="visually-hidden">. {cues.reasons.join('. ')}</span>}
      </p>
      <SongLinks song={song} />
    </aside>
  );
}
