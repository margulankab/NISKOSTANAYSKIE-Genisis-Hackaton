import { useCallback, useEffect, useId, useRef, useState, useMemo } from 'react';
import { SongCard } from '../music/SongOfTheDay';
import { songCues } from '../music/song';
import { atmosphereFor, readSettings, setWorldAtmosphere } from '../menus/settings';
import { FullscreenButton, ImmersiveSession } from '../chrome/ImmersiveControls';
import type { MemoryScene } from '../shared/memory-schema';
import type { MemoryViewerProps } from '../shared/memory-viewer';
import { createWalkLayout } from '../gameplay/layout';
import type { Point } from '../gameplay/layout';
import type { GameState } from '../world/checkpoint';
import { PauseMenu } from '../world/PauseMenu';
import type { MenuTab } from '../world/PauseMenu';
import { buildLore, firstSentence } from '../story/lore';
import { DialogBox, QuestLog, useLoreFeed } from '../story/LoreHud';
import { RevealMoment } from '../story/RevealMoment';
import { SaveToLibrary } from '../story/SaveToLibrary';
import { NowPlaying } from '../story/NowPlaying';
import type { Moment } from '../story/RevealMoment';
import { MusicPicker } from '../music/MusicApps';
import { useT } from '../i18n/i18n';
import { useGamePause } from '../world/use-game-pause';
import { WorldStage } from '../world/WorldStage';
import { artifactNames } from './ArtifactModel';
import { AudioPlayer } from './AudioPlayer';
import { useAssetUrl } from './use-asset-url';
import type { ResolveAsset } from './use-asset-url';
import { WalkStage } from './WalkStage';
import { SceneExplanation } from './SceneExplanation';
import { getSceneStyle } from './scene-style';
import { PlotProgress, usePlotVisit } from '../world/PlotVisit';
import { SceneDirectionDetails } from '../world/SceneDirectionDetails';

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

function MemoryAudio({ id, resolveAsset, onActiveAudio, paused, autoPlay = false }: {
  paused: boolean;
  autoPlay?: boolean;
  id: string;
  resolveAsset: ResolveAsset;
  onActiveAudio: (player: HTMLAudioElement | null) => void;
}) {
  const media = useAssetUrl(id, resolveAsset);
  if (media.status === 'ready') return <AudioPlayer key={media.url} url={media.url} loop onActiveAudio={onActiveAudio} paused={paused} autoPlay={autoPlay} />;
  if (media.status === 'error') return <p role="alert">The memory audio could not be opened.</p>;
  return <button type="button" className="play" disabled>Play soundtrack</button>;
}

type ViewerProps = MemoryViewerProps & {
  game?: { initial?: GameState; save(state: GameState): Promise<void> };
  /** Set when the player pressed Enter world: start the day's audio and use the immersive layout. */
  entered?: boolean;
};

export function MemoryViewer(props: ViewerProps) {
  return <MemoryOpening key={props.manifest.id} {...props} />;
}

function MemoryOpening({ manifest, entryText, world, song, trackName, resolveAsset, onComplete, game, entered = false }: ViewerProps) {
  const songTempo = song ? songCues(song) : null;
  useEffect(() => {
    setWorldAtmosphere(atmosphereFor({ timeOfDay: manifest.context.timeOfDay }));
    return () => setWorldAtmosphere(null);
  }, [manifest.context.timeOfDay]);
  const headingId = useId();
  const artifactGroupId = useId();
  const [legacyRevealed, setRevealed] = useState<ReadonlySet<string>>(() => game?.initial?.revealed ?? new Set());
  const [moment, setMoment] = useState<Moment | null>(null);
  const [complete, setComplete] = useState(game?.initial?.ended ?? false);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [visit, setVisit] = useState(0);
  const plotVisit = usePlotVisit(world?.layout.plot, game?.initial?.momentsCompleted, onComplete);
  const revealed = plotVisit ? new Set(manifest.artifacts.slice(0, plotVisit.ended ? 2 : plotVisit.completed > 0 ? 1 : 0).map(({ id }) => id)) : legacyRevealed;
  const finished = useRef(complete);
  const allRevealed = revealed.size === manifest.artifacts.length;
  const style = getSceneStyle(manifest);
  const firstPhoto = useAssetUrl(world?.layout.geometryVersion === 3 ? manifest.photos[0]?.assetId : undefined, resolveAsset);
  const [spawn] = useState(() => world?.layout.spawn ?? createWalkLayout(style).spawn);
  const position = useRef<Point>(game?.initial?.position ?? spawn);
  const pause = useGamePause({
    initial: game?.initial, progress: () => ({ position: position.current, revealed, ended: plotVisit?.ended ?? complete, momentsCompleted: plotVisit?.completed }),
    persist: game?.save,
  });
  const { paused } = pause;
  const t = useT();
  const [menuTab, setMenuTab] = useState<MenuTab>('game');
  // Lore for a day: quests named after the day's objects, and lines that quote the entry word for word.
  const lore = useMemo(() => buildLore({
    title: manifest.title, date: manifest.date, landmark: t('end of the path'),
    discoveries: [artifactNames[manifest.artifacts[0].kind], artifactNames[manifest.artifacts[1].kind]],
    excerpts: manifest.artifacts.map(({ excerpt }) => excerpt ? entryText.slice(excerpt.start, excerpt.end) : undefined) as [string | undefined, string | undefined],
    opening: firstSentence(entryText),
  }, t), [manifest, entryText, t]);
  const feed = useLoreFeed(lore, {
    started: Boolean(world),
    found: [revealed.has(manifest.artifacts[0].id), revealed.has(manifest.artifacts[1].id)],
    ready: allRevealed,
    ended: complete,
  });

  function reveal(id: string) {
    if (revealed.has(id)) return;
    const artifact = manifest.artifacts.find((item) => item.id === id);
    if (artifact) setMoment({ id, count: revealed.size + 1, title: t(artifactNames[artifact.kind]),
      quote: artifact.excerpt ? entryText.slice(artifact.excerpt.start, artifact.excerpt.end) : undefined,
      photoUrl: artifact.photoId && firstPhoto.status === 'ready' ? firstPhoto.url : undefined });
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
    plotVisit?.reset();
    setVisit((count) => count + 1);
  }

  const useStatic = useCallback(() => setStaticMode(true), []);

  return (
    <>
      <article inert={paused} className={`preview${staticMode ? ' is-static' : ''}`} aria-labelledby={headingId}>
        <header>
          <time dateTime={manifest.date}>{manifest.date}</time>
          <h2 id={headingId}>{manifest.title}</h2>
          {entered && <ImmersiveSession pause={pause.open} />}
          {entered && <FullscreenButton />}
          {game && <button type="button" ref={pause.pauseButton} onClick={pause.open}>Pause</button>}
        </header>
        {plotVisit && !plotVisit.completed && <p className="story-opening">{plotVisit.plot.opening}</p>}
        {song && <SongCard song={song} />}
        {staticMode && (
          <p className="static-note" role="status">Static preview — the 3D world is unavailable here. {plotVisit ? 'Play through the moments below.' : 'Reveal each object from the list below.'}</p>
        )}
        {world ? (
          <WorldStage key={visit} world={world} areaLabel="Memory world" position={position} paused={paused} ended={plotVisit?.ended ?? complete} visit={plotVisit}
            artifactLabels={[artifactNames[manifest.artifacts[0].kind], artifactNames[manifest.artifacts[1].kind]]}
            revealed={new Set(world.layout.discoveries.filter((_, index) => revealed.has(manifest.artifacts[index].id))
              .map(({ placementId }) => placementId))}
            audio={{ activeAudio, music: manifest.music, ambientScale: style.ambientIntensity,
              lightColor: `rgb(${style.accentPalette[0].join(',')})`, detailColor: `rgb(${style.accentPalette[1].join(',')})`,
              photoUrl: firstPhoto.status === 'ready' ? firstPhoto.url : undefined,
              ...(songTempo && { songPulse: { bpm: songTempo.tempo, energy: songTempo.energyLevel } }) }}
            overlay={(
              <>
                {!plotVisit && <QuestLog lore={lore} title={t('Quests')} done={{
                  first: revealed.has(manifest.artifacts[0].id), second: revealed.has(manifest.artifacts[1].id), end: complete,
                }} />}
                {plotVisit && !plotVisit.ended && <p className="plot-quest" aria-live="polite">
                  <span>{t('Moment {count} of {total}', { count: Math.min(plotVisit.completed + 1, plotVisit.plot.moments.length), total: plotVisit.plot.moments.length })}</span>
                  {plotVisit.current?.title}
                </p>}
                {!plotVisit && !complete && <DialogBox line={feed.line} left={feed.left} onNext={feed.next} hint={t('click to continue')} />}
                {!plotVisit && !complete && <RevealMoment moment={moment} />}
                <NowPlaying name={trackName} playing={Boolean(activeAudio) && !paused && !complete && !plotVisit?.ended} />
                {plotVisit?.ended && <div className="closing-card plot-closing" role="status">
                  <h3>{t('Memory complete')}</h3>
                  <p>{plotVisit.plot.closing}</p>
                  <div className="prompt-actions">
                    {game && <SaveToLibrary save={() => game.save({ position: position.current, revealed, ended: true, momentsCompleted: plotVisit.completed })} />}
                    <button type="button" onClick={replay}>{t('Replay visit')}</button>
                  </div>
                </div>}
                {game && (
                  <div className="hud-buttons">
                    <button type="button" className="hud-menu" onClick={() => { setMenuTab('game'); pause.open(); }} disabled={paused}>
                      <span aria-hidden="true">☰</span> {t('Menu')}
                    </button>
                    <button type="button" className="hud-menu" onClick={() => { setMenuTab('settings'); pause.open(); }} disabled={paused}
                      aria-label={t('Settings')}><span aria-hidden="true">⚙</span></button>
                  </div>
                )}
              </>
            )}
            onReveal={(id) => {
              const index = world.layout.discoveries.findIndex(({ placementId }) => placementId === id);
              reveal(manifest.artifacts[index].id);
            }} onFinish={finish} onUnavailable={useStatic} />
        ) : (
          <WalkStage key={visit} manifest={manifest} style={style} revealed={revealed} activeAudio={activeAudio}
            playerPosition={position} paused={paused} onReveal={reveal} onFinish={finish} onUnavailable={useStatic} />
        )}
        {plotVisit && <PlotProgress visit={plotVisit} staticMode={staticMode} onReplay={replay} />}
        {world?.layout.direction
          ? <SceneDirectionDetails direction={world.layout.direction} interpretation={world.interpretation}
            prompt={world.scenePrompt ?? ''} journal photoAccent={`rgb(${style.accentPalette[1].join(',')})`}
            momentBed={plotVisit?.playing || plotVisit?.completed ? (plotVisit.current ?? plotVisit.plot.moments.at(-1))?.ambience : undefined} />
          : <SceneExplanation manifest={manifest} style={style} generated={Boolean(world)} />}
        <div className="memory-actions">
          <p role="status">{revealed.size} of {manifest.artifacts.length} artifacts revealed</p>
          <MemoryAudio id={manifest.source.audioId} resolveAsset={resolveAsset} onActiveAudio={setActiveAudio} paused={paused} autoPlay={entered && readSettings().autoplay} />
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
        {!plotVisit && <footer className="memory-ending">
          {staticMode && !complete && (
            <button type="button" disabled={!allRevealed} onClick={finish}>Finish memory</button>
          )}
          {complete && (
            <div className="closing-card" role="status">
              <h3>{t('Memory complete')}</h3>
              <p>{manifest.title}</p>
              {manifest.artifacts[1].excerpt && <blockquote>{entryText.slice(manifest.artifacts[1].excerpt.start, manifest.artifacts[1].excerpt.end)}</blockquote>}
              <div className="prompt-actions">
                {game && <SaveToLibrary save={() => game.save({ position: position.current, revealed, ended: true })} />}
                <button type="button" onClick={replay}>{t('Replay visit')}</button>
              </div>
            </div>
          )}
        </footer>}
      </article>
      {paused && <PauseMenu {...pause.menu} title={manifest.title} tab={menuTab} onTab={setMenuTab} panels={{
        journal: (
          <div className="journal">
            <ol className="journal-quests">
              {lore.quests.map((quest, index) => {
                const done = index < 2 ? revealed.has(manifest.artifacts[index].id) : complete;
                return (
                  <li key={quest.id} className={done ? 'is-done' : undefined}>
                    <span className="quest-box" aria-hidden="true" /><span>{quest.text}</span>
                    {index < 2 && done && lore.found[index][0]?.quote && <q>{lore.found[index][0].quote}</q>}
                  </li>
                );
              })}
            </ol>
          </div>
        ),
        music: <div className="menu-music"><MusicPicker song={song} /></div>,
      }} />}
    </>
  );
}
