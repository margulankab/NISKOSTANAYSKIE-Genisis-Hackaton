import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/i18n';
import { readSettings, subscribeToSettings } from '../menus/settings';

export function AudioPlayer({ url, onActiveAudio, loop = false, muted = false, paused = false, preview = false, autoPlay = false }: {
  url: string;
  onActiveAudio: (player: HTMLAudioElement | null) => void;
  loop?: boolean;
  muted?: boolean;
  paused?: boolean;
  preview?: boolean;
  /** Start once on mount; used right after the player pressed Enter world. */
  autoPlay?: boolean;
}) {
  const t = useT();
  const [blocked, setBlocked] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const resumeOnUnpause = useRef(false);

  useEffect(() => subscribeToSettings(() => {
    if (audio.current) audio.current.volume = readSettings().volume;
  }), []);

  useEffect(() => {
    const player = audio.current;
    return () => {
      player?.pause();
      onActiveAudio(null);
    };
  }, [onActiveAudio]);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    if (paused) {
      resumeOnUnpause.current = !player.paused;
      player.pause();
    } else if (resumeOnUnpause.current) {
      resumeOnUnpause.current = false;
      void player.play().catch(() => {});
    }
  }, [paused]);

  // Entering a world is the gesture that allows sound; if the browser still refuses, offer the button.
  // It also resumes after the pause menu closes, until the player uses the button themselves.
  const playerChose = useRef(false);
  useEffect(() => {
    const player = audio.current;
    if (!autoPlay || paused || playerChose.current || !player) return;
    let cancelled = false;
    player.play().catch((error: unknown) => {
      if (!cancelled && error instanceof DOMException && error.name === 'NotAllowedError') setBlocked(true);
    });
    return () => { cancelled = true; };
  }, [autoPlay, paused]);

  // Some browsers (phones especially) only allow sound inside a gesture: start on the first key or tap in the world.
  useEffect(() => {
    if (!blocked) return;
    const retry = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('button, a, select, input, label, summary')) return;
      audio.current?.play().then(() => setBlocked(false), () => {});
    };
    window.addEventListener('keydown', retry);
    window.addEventListener('pointerdown', retry);
    return () => { window.removeEventListener('keydown', retry); window.removeEventListener('pointerdown', retry); };
  }, [blocked]);

  function updateActivePlayback(player: HTMLAudioElement) {
    onActiveAudio(!player.paused && !player.ended && player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
      ? player
      : null);
  }

  async function toggle() {
    const player = audio.current;
    if (!player) return;
    setFailed(false);
    setBlocked(false);
    playerChose.current = true;
    if (!player.paused) {
      player.pause();
      return;
    }
    try {
      await player.play();
    } catch {
      setFailed(true);
      setPlaying(false);
      onActiveAudio(null);
    }
  }

  return (
    <>
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        loop={loop}
        muted={muted}
        onPlay={() => setPlaying(true)}
        onPlaying={({ currentTarget }) => updateActivePlayback(currentTarget)}
        onWaiting={() => onActiveAudio(null)}
        onSeeking={() => onActiveAudio(null)}
        onSeeked={({ currentTarget }) => updateActivePlayback(currentTarget)}
        onPause={() => {
          setPlaying(false);
          onActiveAudio(null);
        }}
        onEnded={() => {
          setPlaying(false);
          onActiveAudio(null);
        }}
        onError={() => {
          setFailed(true);
          setPlaying(false);
          onActiveAudio(null);
        }}
      />
      <button type="button" className="play" onClick={toggle} disabled={paused}>
        {t(playing ? 'Pause soundtrack' : preview ? 'Preview soundtrack' : 'Play soundtrack')}
      </button>
      {blocked && !playing && <p className="field-hint">{t('Music is ready. It starts with your first step, or press Play.')}</p>}
      {failed && <p role="alert">The soundtrack could not play.</p>}
    </>
  );
}
