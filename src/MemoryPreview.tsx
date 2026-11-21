import { useEffect, useId, useRef, useState } from 'react';
import type { MemoryViewerProps } from './shared/memory-viewer';

export function MemoryPreview({ manifest, entryText, resolveAsset, fixture = false }: MemoryViewerProps & { fixture?: boolean }) {
  const titleId = useId();
  const audioLabel = fixture ? 'test tone' : 'audio excerpt';
  const [media, setMedia] = useState<{ photo: string; audio: string }>();
  const [mediaError, setMediaError] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioPlayer = useRef<HTMLAudioElement>(null);
  const artifact = manifest.artifacts.find(({ photoId }) => photoId !== null);
  const note = manifest.artifacts.find(({ excerpt }) => excerpt !== null)?.excerpt;
  const photoId = artifact?.photoId ?? manifest.source.photoIds[0];
  const caption = manifest.photos.find(({ assetId }) => assetId === photoId)?.caption;

  useEffect(() => {
    let disposed = false;
    let urls: { photo: string; audio: string } | undefined;
    Promise.all([resolveAsset(photoId), resolveAsset(manifest.source.audioId)]).then(
      ([photo, audio]) => {
        if (disposed) return;
        urls = { photo: URL.createObjectURL(photo), audio: URL.createObjectURL(audio) };
        setMedia(urls);
      },
    ).catch(() => { if (!disposed) setMediaError(true); });
    return () => {
      disposed = true;
      if (urls) {
        URL.revokeObjectURL(urls.photo);
        URL.revokeObjectURL(urls.audio);
      }
    };
  }, [manifest.source.audioId, photoId, resolveAsset]);

  useEffect(() => {
    const player = audioPlayer.current;
    return () => player?.pause();
  }, [media]);

  async function togglePlayback() {
    const player = audioPlayer.current;
    if (!player) return;
    setPlaybackError(false);
    if (!player.paused) {
      player.pause();
      return;
    }
    try {
      await player.play();
    } catch {
      setPlaybackError(true);
    }
  }

  return (
    <article className="preview" aria-labelledby={titleId}>
      <header>
        <time dateTime={manifest.date}>{manifest.date}</time>
        <h2 id={titleId}>{manifest.title}</h2>
      </header>
      {mediaError && <p role="alert">The memory media could not be opened.</p>}
      {media && (
        <>
          <figure>
            <img src={media.photo} alt={caption ?? (fixture ? 'Fixture illustration' : 'Photo from your memory')} width="480" height="300" />
          </figure>
          <audio ref={audioPlayer} src={media.audio} preload="metadata"
            onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)} onError={() => setPlaybackError(true)} />
        </>
      )}
      {note && <blockquote>{entryText.slice(note.start, note.end)}</blockquote>}
      <button type="button" className="play" disabled={!media} onClick={togglePlayback}>
        {playing ? 'Pause' : 'Play'} {audioLabel}
      </button>
      {playbackError && <p role="alert">The {audioLabel} could not play.</p>}
    </article>
  );
}
