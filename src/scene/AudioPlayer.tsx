import { useEffect, useRef, useState } from 'react';

export function AudioPlayer({ url, onActiveAudio, loop = false, muted = false, paused = false, preview = false }: {
  url: string;
  onActiveAudio: (player: HTMLAudioElement | null) => void;
  loop?: boolean;
  muted?: boolean;
  paused?: boolean;
  preview?: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const player = audio.current;
    return () => {
      player?.pause();
      onActiveAudio(null);
    };
  }, [onActiveAudio]);

  useEffect(() => {
    if (paused) audio.current?.pause();
  }, [paused]);

  function updateActivePlayback(player: HTMLAudioElement) {
    onActiveAudio(!player.paused && !player.ended && player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
      ? player
      : null);
  }

  async function toggle() {
    const player = audio.current;
    if (!player) return;
    setFailed(false);
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
        {playing ? 'Pause soundtrack' : preview ? 'Preview soundtrack' : 'Play soundtrack'}
      </button>
      {failed && <p role="alert">The soundtrack could not play.</p>}
    </>
  );
}
