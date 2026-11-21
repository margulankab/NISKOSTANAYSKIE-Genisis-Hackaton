import { useEffect, useId, useRef, useState } from 'react';
import type { MemoryScene } from '../shared/memory-schema';
import type { MemoryViewerProps } from '../shared/memory-viewer';
import { artifactNames } from './ArtifactModel';
import { MemoryStage } from './MemoryStage';

type AssetUrl = { status: 'loading' | 'error' } | { status: 'ready'; url: string };
type ResolveAsset = MemoryViewerProps['resolveAsset'];

function useAssetUrl(id: string, resolveAsset: ResolveAsset): AssetUrl {
  const [result, setResult] = useState<AssetUrl>({ status: 'loading' });

  useEffect(() => {
    let disposed = false;
    let url: string | undefined;
    setResult({ status: 'loading' });

    async function open() {
      try {
        const blob = await resolveAsset(id);
        if (disposed) return;
        url = URL.createObjectURL(blob);
        setResult({ status: 'ready', url });
      } catch {
        if (!disposed) setResult({ status: 'error' });
      }
    }

    void open();
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, resolveAsset]);

  return result;
}

function ArtifactPhoto({ photo, resolveAsset }: { photo: MemoryScene['photos'][number]; resolveAsset: ResolveAsset }) {
  const media = useAssetUrl(photo.assetId, resolveAsset);
  const [failedUrl, setFailedUrl] = useState<string>();

  if (media.status === 'ready' && failedUrl !== media.url) {
    return (
      <figure>
        <img
          src={media.url}
          alt={photo.caption || 'Memory photo'}
          width={photo.width}
          height={photo.height}
          onError={() => setFailedUrl(media.url)}
        />
        {photo.caption && <figcaption>{photo.caption}</figcaption>}
      </figure>
    );
  }

  if (media.status === 'loading') return <p role="status">Opening photo…</p>;
  return <p role="alert">This artifact’s photo could not be opened.</p>;
}

function AudioPlayer({ url }: { url: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const player = audio.current;
    return () => player?.pause();
  }, []);

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
    }
  }

  return (
    <>
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button type="button" className="play" onClick={toggle}>
        {playing ? 'Pause test tone' : 'Play test tone'}
      </button>
      {failed && <p role="alert">The test tone could not play.</p>}
    </>
  );
}

function MemoryAudio({ id, resolveAsset }: { id: string; resolveAsset: ResolveAsset }) {
  const media = useAssetUrl(id, resolveAsset);
  if (media.status === 'ready') return <AudioPlayer key={media.url} url={media.url} />;
  if (media.status === 'error') return <p role="alert">The memory audio could not be opened.</p>;
  return <button type="button" className="play" disabled>Play test tone</button>;
}

export function MemoryViewer(props: MemoryViewerProps) {
  return <MemoryOpening key={props.manifest.id} {...props} />;
}

function MemoryOpening({ manifest, entryText, resolveAsset, onComplete }: MemoryViewerProps) {
  const headingId = useId();
  const artifactGroupId = useId();
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const [complete, setComplete] = useState(false);
  const finished = useRef(false);
  const allRevealed = revealed.size === manifest.artifacts.length;

  function reveal(id: string) {
    setRevealed((previous) => previous.has(id) ? previous : new Set([...previous, id]));
  }

  function finish() {
    if (!allRevealed || finished.current) return;
    finished.current = true;
    setComplete(true);
    onComplete();
  }

  return (
    <article className="preview" aria-labelledby={headingId}>
      <header>
        <time dateTime={manifest.date}>{manifest.date}</time>
        <h2 id={headingId}>{manifest.title}</h2>
      </header>
      <MemoryStage manifest={manifest} revealed={revealed} onReveal={reveal} />
      <div className="memory-actions">
        <p role="status">{revealed.size} of {manifest.artifacts.length} artifacts revealed</p>
        <MemoryAudio id={manifest.source.audioId} resolveAsset={resolveAsset} />
      </div>
      <div className="artifact-grid">
        {manifest.artifacts.map(({ id, kind, photoId, excerpt }, index) => {
          const open = revealed.has(id);
          const photo = manifest.photos.find(({ assetId }) => assetId === photoId);
          const panelId = artifactGroupId + '-' + id;
          return (
            <section key={id} className="artifact-card">
              <button
                type="button"
                className="artifact-toggle"
                aria-controls={panelId}
                aria-expanded={open}
                onClick={() => reveal(id)}
              >
                <span className="artifact-number">{index + 1}</span>
                <span>{artifactNames[kind]}</span>
                <span className="artifact-state">{open ? 'Revealed' : 'Reveal'}</span>
              </button>
              <div id={panelId} className="artifact-content" hidden={!open}>
                {open && photo && <ArtifactPhoto key={photo.assetId} photo={photo} resolveAsset={resolveAsset} />}
                {open && excerpt && <blockquote>{entryText.slice(excerpt.start, excerpt.end)}</blockquote>}
              </div>
            </section>
          );
        })}
      </div>
      <footer className="memory-ending">
        <button type="button" disabled={!allRevealed || complete} onClick={finish}>Finish memory</button>
        {complete && (
          <div className="closing-card" role="status">
            <h3>Memory complete</h3>
            <p>{manifest.title}</p>
          </div>
        )}
      </footer>
    </article>
  );
}
