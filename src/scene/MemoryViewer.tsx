import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { MemoryScene } from '../shared/memory-schema';
import type { MemoryViewerProps } from '../shared/memory-viewer';
import { artifactNames } from './ArtifactModel';
import { WalkStage } from './WalkStage';
import { SceneExplanation } from './SceneExplanation';
import { getSceneStyle } from './scene-style';

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

function AudioPlayer({ url, onActiveAudio }: {
  url: string;
  onActiveAudio: (player: HTMLAudioElement | null) => void;
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
      <button type="button" className="play" onClick={toggle}>
        {playing ? 'Pause soundtrack' : 'Play soundtrack'}
      </button>
      {failed && <p role="alert">The soundtrack could not play.</p>}
    </>
  );
}

function MemoryAudio({ id, resolveAsset, onActiveAudio }: {
  id: string;
  resolveAsset: ResolveAsset;
  onActiveAudio: (player: HTMLAudioElement | null) => void;
}) {
  const media = useAssetUrl(id, resolveAsset);
  if (media.status === 'ready') return <AudioPlayer key={media.url} url={media.url} onActiveAudio={onActiveAudio} />;
  if (media.status === 'error') return <p role="alert">The memory audio could not be opened.</p>;
  return <button type="button" className="play" disabled>Play soundtrack</button>;
}

export function MemoryViewer(props: MemoryViewerProps) {
  return <MemoryOpening key={props.manifest.id} {...props} />;
}

function MemoryOpening({ manifest, entryText, resolveAsset, onComplete }: MemoryViewerProps) {
  const headingId = useId();
  const artifactGroupId = useId();
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const [complete, setComplete] = useState(false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [visit, setVisit] = useState(0);
  const finished = useRef(false);
  const allRevealed = revealed.size === manifest.artifacts.length;
  const style = getSceneStyle(manifest);

  function reveal(id: string) {
    setRevealed((previous) => previous.has(id) ? previous : new Set([...previous, id]));
  }

  function finish() {
    if (!allRevealed || finished.current) return;
    finished.current = true;
    setComplete(true);
    onComplete();
  }

  function replay() {
    finished.current = false;
    setRevealed(new Set());
    setComplete(false);
    setVisit((count) => count + 1);
  }

  const useStatic = useCallback(() => setStaticMode(true), []);

  return (
    <article className="preview" aria-labelledby={headingId}>
      <header>
        <time dateTime={manifest.date}>{manifest.date}</time>
        <h2 id={headingId}>{manifest.title}</h2>
      </header>
      {staticMode && (
        <p className="static-note" role="status">Static preview — the 3D world is unavailable here. Reveal each object from the list below.</p>
      )}
      <WalkStage key={visit} manifest={manifest} style={style} revealed={revealed} activeAudio={activeAudio}
        onReveal={reveal} onFinish={finish} onUnavailable={useStatic} />
      <SceneExplanation manifest={manifest} style={style} />
      <div className="memory-actions">
        <p role="status">{revealed.size} of {manifest.artifacts.length} artifacts revealed</p>
        <MemoryAudio id={manifest.source.audioId} resolveAsset={resolveAsset} onActiveAudio={setActiveAudio} />
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
                disabled={!staticMode && !open}
                onClick={() => reveal(id)}
              >
                <span className="artifact-number">{index + 1}</span>
                <span>{artifactNames[kind]}</span>
                <span className="artifact-state">{open ? 'Revealed' : staticMode ? 'Reveal' : 'Find it in the world'}</span>
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
        {staticMode && !complete && (
          <button type="button" disabled={!allRevealed} onClick={finish}>Finish memory</button>
        )}
        {complete && (
          <div className="closing-card" role="status">
            <h3>Memory complete</h3>
            <p>{manifest.title}</p>
            <button type="button" onClick={replay}>Replay visit</button>
          </div>
        )}
      </footer>
    </article>
  );
}
