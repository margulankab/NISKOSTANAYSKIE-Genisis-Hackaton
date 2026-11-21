import { useCallback, useId, useRef, useState } from 'react';
import type { MemoryScene } from '../shared/memory-schema';
import type { MemoryViewerProps } from '../shared/memory-viewer';
import { createWalkLayout } from '../gameplay/layout';
import type { Point } from '../gameplay/layout';
import type { GameState } from '../world/checkpoint';
import { PauseMenu } from '../world/PauseMenu';
import { useGamePause } from '../world/use-game-pause';
import { WorldStage } from '../world/WorldStage';
import { artifactNames } from './ArtifactModel';
import { AudioPlayer } from './AudioPlayer';
import { useAssetUrl } from './use-asset-url';
import type { ResolveAsset } from './use-asset-url';
import { WalkStage } from './WalkStage';
import { SceneExplanation } from './SceneExplanation';
import { getSceneStyle } from './scene-style';

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

function MemoryAudio({ id, resolveAsset, onActiveAudio, paused }: {
  paused: boolean;
  id: string;
  resolveAsset: ResolveAsset;
  onActiveAudio: (player: HTMLAudioElement | null) => void;
}) {
  const media = useAssetUrl(id, resolveAsset);
  if (media.status === 'ready') return <AudioPlayer key={media.url} url={media.url} onActiveAudio={onActiveAudio} paused={paused} />;
  if (media.status === 'error') return <p role="alert">The memory audio could not be opened.</p>;
  return <button type="button" className="play" disabled>Play soundtrack</button>;
}

type ViewerProps = MemoryViewerProps & {
  game?: { initial?: GameState; save(state: GameState): Promise<void> };
};

export function MemoryViewer(props: ViewerProps) {
  return <MemoryOpening key={props.manifest.id} {...props} />;
}

function MemoryOpening({ manifest, entryText, world, resolveAsset, onComplete, game }: ViewerProps) {
  const headingId = useId();
  const artifactGroupId = useId();
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => game?.initial?.revealed ?? new Set());
  const [complete, setComplete] = useState(game?.initial?.ended ?? false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [visit, setVisit] = useState(0);
  const finished = useRef(complete);
  const allRevealed = revealed.size === manifest.artifacts.length;
  const style = getSceneStyle(manifest);
  const firstPhoto = useAssetUrl(world?.layout.geometryVersion === 3 ? manifest.photos[0]?.assetId : undefined, resolveAsset);
  const [spawn] = useState(() => world?.layout.spawn ?? createWalkLayout(style).spawn);
  const position = useRef<Point>(game?.initial?.position ?? spawn);
  const pause = useGamePause({
    initial: game?.initial, progress: () => ({ position: position.current, revealed, ended: complete }),
    persist: game?.save,
  });
  const { paused } = pause;

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
    position.current = spawn;
    finished.current = false;
    setRevealed(new Set());
    setComplete(false);
    setVisit((count) => count + 1);
  }

  const useStatic = useCallback(() => setStaticMode(true), []);

  return (
    <>
      <article inert={paused} className="preview" aria-labelledby={headingId}>
        <header>
          <time dateTime={manifest.date}>{manifest.date}</time>
          <h2 id={headingId}>{manifest.title}</h2>
          {game && <button type="button" ref={pause.pauseButton} onClick={pause.open}>Pause</button>}
        </header>
        {staticMode && (
          <p className="static-note" role="status">Static preview — the 3D world is unavailable here. Reveal each object from the list below.</p>
        )}
        {world ? (
          <WorldStage key={visit} world={world} areaLabel="Memory world" position={position} paused={paused} ended={complete}
            artifactLabels={[artifactNames[manifest.artifacts[0].kind], artifactNames[manifest.artifacts[1].kind]]}
            revealed={new Set(world.layout.discoveries.filter((_, index) => revealed.has(manifest.artifacts[index].id))
              .map(({ placementId }) => placementId))}
            audio={{ activeAudio, music: manifest.music, ambientScale: style.ambientIntensity,
              lightColor: `rgb(${style.accentPalette[0].join(',')})`, detailColor: `rgb(${style.accentPalette[1].join(',')})`,
              photoUrl: firstPhoto.status === 'ready' ? firstPhoto.url : undefined }}
            onReveal={(id) => {
              const index = world.layout.discoveries.findIndex(({ placementId }) => placementId === id);
              reveal(manifest.artifacts[index].id);
            }} onFinish={finish} onUnavailable={useStatic} />
        ) : (
          <WalkStage key={visit} manifest={manifest} style={style} revealed={revealed} activeAudio={activeAudio}
            playerPosition={position} paused={paused} onReveal={reveal} onFinish={finish} onUnavailable={useStatic} />
        )}
        <SceneExplanation manifest={manifest} style={style} generated={Boolean(world)} />
        <div className="memory-actions">
          <p role="status">{revealed.size} of {manifest.artifacts.length} artifacts revealed</p>
          <MemoryAudio id={manifest.source.audioId} resolveAsset={resolveAsset} onActiveAudio={setActiveAudio} paused={paused} />
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
                  {open && photo && <div className="photo-gallery">{manifest.photos.map(item =>
                    <ArtifactPhoto key={item.assetId} photo={item} resolveAsset={resolveAsset} />)}</div>}
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
              {manifest.artifacts[1].excerpt && <blockquote>{entryText.slice(manifest.artifacts[1].excerpt.start, manifest.artifacts[1].excerpt.end)}</blockquote>}
              <button type="button" onClick={replay}>Replay visit</button>
            </div>
          )}
        </footer>
      </article>
      {paused && <PauseMenu {...pause.menu} />}
    </>
  );
}
