import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Point } from '../gameplay/layout';
import { WorldSoundtrack } from '../scene/WorldSoundtrack';
import type { ResolvedWorldSoundtrack, SoundtrackChoice } from '../media/world-soundtrack';
import { localGames } from '../data/game-repository';
import type { GameRepository } from '../data/game-repository';
import { createCheckpoint } from './checkpoint';
import type { GameState } from './checkpoint';
import { InterpretationPanel } from './InterpretationPanel';
import { PauseMenu } from './PauseMenu';
import type { MenuTab } from './PauseMenu';
import { MusicPicker } from '../music/MusicApps';
import { useNowPlaying } from '../music/player-store';
import { canFullscreen, enterWorld } from '../chrome/immersive';
import { readSettings } from '../menus/settings';
import { useGamePause } from './use-game-pause';
import { WorldStage, labelFor } from './WorldStage';
import type { PromptWorld } from './world-schema';
import type { StoryStep } from './memory-story-schema';
import { prefersReducedMotion, subscribeToReducedMotion } from '../scene/reduced-motion';
import { SongCard } from '../music/SongOfTheDay';
import { songCues } from '../music/song';
import { atmosphereFor, setWorldAtmosphere } from '../menus/settings';
import { useT } from '../i18n/i18n';
import { navigate } from '../chrome/route';
import { buildLore } from '../story/lore';
import { DialogBox, QuestLog, useLoreFeed } from '../story/LoreHud';
import { useImmersiveSession, FullscreenButton } from '../chrome/ImmersiveControls';

/** One play session of a prompt world: walking, discoveries, ending, pause menu and saving. */
export function GameSession({ world, initial, initialSoundtrack, autoStart = false, repository = localGames, leave = () => navigate('/') }: {
  world: PromptWorld;
  /** Restored checkpoint state, or null to start at spawn. */
  initial: GameState | null;
  initialSoundtrack: SoundtrackChoice;
  /** True right after Enter world: start the soundtrack without another click. */
  autoStart?: boolean;
  repository?: GameRepository;
  leave?: () => void;
}) {
  const headingId = useId();
  const position = useRef<Point>(initial?.position ?? world.layout.spawn);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => initial?.revealed ?? new Set());
  const [ended, setEnded] = useState(initial?.ended ?? false);
  const [storyStep, setStoryStep] = useState<StoryStep | undefined>(initial?.storyStep);
  const story = world.story;
  const conversation = useRef<HTMLElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const [visit, setVisit] = useState(0);
  const [soundtrack, setSoundtrack] = useState(initialSoundtrack);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(autoStart);
  const t = useT();
  const [menuTab, setMenuTab] = useState<MenuTab>('game');
  // A music-app player takes over: the game's own score pauses while it is loaded.
  const external = useNowPlaying();
  // Opened from Continue or Load Game: offer a Play button that enters full screen (browsers need a click for it).
  const [needsStart, setNeedsStart] = useState(() => !autoStart && readSettings().fullscreen && canFullscreen() && !document.fullscreenElement);
  function start() {
    enterWorld({ words: '', title: world.title, lines: [t('opening the world')] });
    setNeedsStart(false);
    setAutoPlay(readSettings().autoplay);
  }
  const menu = useGamePause({
    initial, selection: JSON.stringify([soundtrack.record, soundtrack.muted]),
    progress: () => ({ position: position.current, revealed, ended, storyStep }),
    persist: (state) => repository.saveGame(world, createCheckpoint(world, state), soundtrack),
    leave,
  });
  const { paused } = menu;
  useImmersiveSession(menu.open);
  const music = soundtrack.record.kind === 'silent' ? undefined : soundtrack.record.music;
  const songTempo = world.song ? songCues(world.song) : null;
  // Auto atmosphere: the interface takes on this world's time of day and weather while it is open.
  useEffect(() => {
    setWorldAtmosphere(atmosphereFor(world.interpretation));
    return () => setWorldAtmosphere(null);
  }, [world.interpretation]);
  const discoveries = world.layout.discoveries;
  const lore = useMemo(() => buildLore({
    title: world.title,
    discoveries: [t(labelFor(world, discoveries[0].placementId)), t(labelFor(world, discoveries[1].placementId))],
    landmark: t(labelFor(world, world.layout.landmark.placementId)),
    excerpts: [0, 1].map((index) => {
      const { start, end } = discoveries[index].excerpt;
      return end > start ? world.prompt.slice(start, end) : undefined;
    }) as [string | undefined, string | undefined],
    character: story?.npc.name,
    timeOfDay: world.interpretation.timeOfDay,
  }, t), [world, discoveries, story, t]);
  const feed = useLoreFeed(lore, {
    started: true,
    found: [revealed.has(discoveries[0].placementId), revealed.has(discoveries[1].placementId)],
    ready: revealed.size >= 2,
    ended,
  });
  const latestDiscovery = [...revealed].at(-1);
  const discoveryNotes = story && [story.firstDiscovery, story.secondDiscovery];
  const reply = storyStep === 'first' ? story?.firstReply : storyStep === 'second' ? story?.secondReply : undefined;
  useEffect(() => { if (storyStep && !paused) requestAnimationFrame(() => conversation.current?.focus()); }, [paused, storyStep]);

  const reveal = useCallback((id: string) => {
    setRevealed((previous) => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);
  const finish = useCallback(() => {
    if (revealed.size < 2 || ended || storyStep) return;
    if (story) setStoryStep('dialogue');
    else setEnded(true);
  }, [revealed, ended, story, storyStep]);
  const useStatic = useCallback(() => setStaticMode(true), []);

  function replay() {
    position.current = world.layout.spawn;
    setRevealed(new Set());
    setEnded(false);
    setStoryStep(undefined);
    setVisit((count) => count + 1);
  }

  function chooseReply(choice: 'first' | 'second') {
    setStoryStep(choice);
    setEnded(true);
  }

  function changeTrack(value: ResolvedWorldSoundtrack) {
    setActiveAudio(null);
    setAutoPlay(false);
    setSoundtrack((previous) => ({ ...value, muted: previous.muted }));
  }

  return (
    <>
      <article className={`preview game-session${staticMode ? ' is-static' : ''}`} aria-labelledby={headingId} inert={paused}>
        <header className="game-header">
          <div>
            <p className="memory-context">{story ? story.place : t('Prompt world')}</p>
            <h2 id={headingId}>{world.title}</h2>
          </div>
          <div className="game-header-actions">
            <FullscreenButton />
            <button type="button" ref={menu.pauseButton} onClick={menu.open}>{t('Pause')}</button>
          </div>
        </header>
        {story && !storyStep && <p className="story-opening">{story.opening}</p>}
        {story && !storyStep && latestDiscovery && (
          <p className="story-discovery" role="status">{discoveryNotes?.[latestDiscovery === discoveries[0].placementId ? 0 : 1]}</p>
        )}
        {story && storyStep === 'dialogue' && (
          <section className="closing-card story-conversation" ref={conversation} tabIndex={-1} aria-label="Memory conversation">
            <h3>{story.npc.name}</h3>
            <p>{story.greeting}</p>
            <div className="prompt-actions">
              <button type="button" onClick={() => chooseReply('first')}>{story.firstReply.choice}</button>
              <button type="button" onClick={() => chooseReply('second')}>{story.secondReply.choice}</button>
            </div>
          </section>
        )}
        {story && reply && (
          <section className="closing-card story-conversation" ref={conversation} tabIndex={-1} aria-label="Memory complete">
            <h3>{t('Memory complete')}</h3>
            <p>{story.npc.name}: {reply.answer}</p>
            <p>{story.closing}</p>
            <button type="button" onClick={replay}>{t('Replay visit')}</button>
          </section>
        )}
        {staticMode && (
          <p className="static-note" role="status">Static preview — the 3D world is unavailable here. Reveal each discovery from the list below.</p>
        )}
        <div key={visit} className={story && !reducedMotion ? `story-stage${ended ? ' story-stage-ended' : ''}` : undefined}>
          <WorldStage world={world} revealed={revealed} ended={ended} position={position} paused={paused || !!storyStep}
            conversationOpen={!!storyStep} overlay={(
              <>
                <QuestLog lore={lore} title={t('Quests')} done={{
                  first: revealed.has(discoveries[0].placementId), second: revealed.has(discoveries[1].placementId), end: ended,
                }} />
                <DialogBox line={feed.line} left={feed.left} onNext={feed.next} hint={t('click to continue')} />
                <div className="hud-buttons">
                  <button type="button" className="hud-menu" onClick={() => { setMenuTab('game'); menu.open(); }} disabled={paused}>
                    <span aria-hidden="true">☰</span> {t('Menu')}
                  </button>
                  <button type="button" className="hud-menu" onClick={() => { setMenuTab('settings'); menu.open(); }} disabled={paused}
                    aria-label={t('Settings')}>
                    <span aria-hidden="true">⚙</span>
                  </button>
                </div>
                {needsStart && (
                  <div className="play-overlay">
                    <button type="button" className="play-big" onClick={start}><span aria-hidden="true">▶</span> {t('Play')}</button>
                    <p>{world.title}</p>
                  </div>
                )}
              </>
            )} audio={{ activeAudio, music, ...(songTempo && { songPulse: { bpm: songTempo.tempo, energy: songTempo.energyLevel } }) }} onReveal={reveal} onFinish={finish} onUnavailable={useStatic} />
        </div>
        <div className="memory-actions">
          <p role="status">{t('{count} of 2 discoveries found', { count: revealed.size })}</p>
        </div>
        {world.song && <SongCard song={world.song} />}
        <WorldSoundtrack value={soundtrack} onChange={changeTrack} onActiveAudio={setActiveAudio} paused={paused || Boolean(external)} autoPlay={autoPlay}
          mute={{ value: soundtrack.muted, onChange: (muted) => setSoundtrack((previous) => ({ ...previous, muted })) }} />
        <div className="artifact-grid">
          {discoveries.map(({ placementId, excerpt }, index) => {
            const open = revealed.has(placementId);
            return (
              <section key={placementId} className="artifact-card">
                <button type="button" className="artifact-toggle" aria-expanded={open} disabled={!staticMode || open}
                  onClick={() => reveal(placementId)}>
                  <span className="artifact-number">{index + 1}</span>
                  <span>{labelFor(world, placementId)}</span>
                  <span className="artifact-state">{t(open ? 'Found' : staticMode ? 'Reveal' : 'Find it in the world')}</span>
                </button>
                {open && <blockquote>{world.prompt.slice(excerpt.start, excerpt.end)}</blockquote>}
                {open && discoveryNotes && <p>{discoveryNotes[index]}</p>}
              </section>
            );
          })}
        </div>
        <footer className="memory-ending">
          {staticMode && !ended && !storyStep && <button type="button" disabled={revealed.size < 2} onClick={finish}>
            {story ? `Talk to ${story.npc.name}` : 'Finish world'}
          </button>}
          {ended && !story && (
            <div className="closing-card" role="status">
              <h3>{t('World complete')}</h3>
              <p>{world.title}</p>
              <button type="button" onClick={replay}>{t('Replay visit')}</button>
            </div>
          )}
        </footer>
        <details className="interpretation-details">
          <summary>{t('How this world was built')}</summary>
          <p>{world.scene?.processing === 'gemini' ? t('Gemini planned this fictional scene.') : t('The scene was built privately on this device.')}
            {story && t(' The conversation is imagined.')}</p>
          {story && (
            <>
              {story.originalPrompt !== world.prompt && <blockquote>{story.originalPrompt}</blockquote>}
            </>
          )}
          <InterpretationPanel prompt={world.prompt} interpretation={world.interpretation} />
        </details>
      </article>
      {paused && <PauseMenu {...menu.menu} title={world.title} tab={menuTab} onTab={setMenuTab} panels={{
        journal: (
          <div className="journal">
            <ol className="journal-quests">
              {lore.quests.map((quest, index) => {
                const done = index < 2 ? revealed.has(discoveries[index].placementId) : ended;
                return (
                  <li key={quest.id} className={done ? 'is-done' : undefined}>
                    <span className="quest-box" aria-hidden="true" /><span>{quest.text}</span>
                    {index < 2 && done && lore.found[index][0]?.quote && <q>{lore.found[index][0].quote}</q>}
                  </li>
                );
              })}
            </ol>
            <p className="journal-note">{story ? story.opening : t('Everything in this world comes from your description. Quotes are your own words.')}</p>
          </div>
        ),
        music: (
          <div className="menu-music">
            <div className="menu-score">
              <p><span className="quick-label">{t('Game score')}</span> {soundtrack.record.kind === 'silent' ? t('Silence') : soundtrack.record.title}</p>
              <button type="button" aria-pressed={!soundtrack.muted}
                onClick={() => setSoundtrack((previous) => ({ ...previous, muted: !previous.muted }))}>
                {t(soundtrack.muted ? 'Unmute score' : 'Mute score')}
              </button>
            </div>
            <MusicPicker song={world.song} />
          </div>
        ),
      }} />}
    </>
  );
}
