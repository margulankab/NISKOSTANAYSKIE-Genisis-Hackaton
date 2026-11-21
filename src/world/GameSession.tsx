import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { Point } from '../gameplay/layout';
import { WorldSoundtrack } from '../scene/WorldSoundtrack';
import type { ResolvedWorldSoundtrack, SoundtrackChoice } from '../media/world-soundtrack';
import { localGames } from '../data/game-repository';
import type { GameRepository } from '../data/game-repository';
import { createCheckpoint } from './checkpoint';
import type { GameState } from './checkpoint';
import { InterpretationPanel } from './InterpretationPanel';
import { PauseMenu } from './PauseMenu';
import { useGamePause } from './use-game-pause';
import { WorldStage, labelFor } from './WorldStage';
import type { PromptWorld } from './world-schema';
import type { StoryStep } from './memory-story-schema';
import { prefersReducedMotion, subscribeToReducedMotion } from '../scene/reduced-motion';

/** One play session of a prompt world: walking, discoveries, ending, pause menu and saving. */
export function GameSession({ world, initial, initialSoundtrack, repository = localGames, leave = () => window.location.assign('/') }: {
  world: PromptWorld;
  /** Restored checkpoint state, or null to start at spawn. */
  initial: GameState | null;
  initialSoundtrack: SoundtrackChoice;
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
  const menu = useGamePause({
    initial, selection: JSON.stringify([soundtrack.record, soundtrack.muted]),
    progress: () => ({ position: position.current, revealed, ended, storyStep }),
    persist: (state) => repository.saveGame(world, createCheckpoint(world, state), soundtrack),
    leave,
  });
  const { paused } = menu;
  const music = soundtrack.record.kind === 'silent' ? undefined : soundtrack.record.music;
  const discoveries = world.layout.discoveries;
  const latestDiscovery = [...revealed].at(-1);
  const discoveryNotes = story && [story.firstDiscovery, story.secondDiscovery];
  const reply = storyStep === 'first' ? story?.firstReply : storyStep === 'second' ? story?.secondReply : undefined;
  useEffect(() => { if (storyStep) conversation.current?.focus(); }, [storyStep]);

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
    setSoundtrack((previous) => ({ ...value, muted: previous.muted }));
  }

  return (
    <>
      <article className="preview game-session" aria-labelledby={headingId} inert={paused}>
        <header className="game-header">
          <div>
            <p className="memory-context">{story ? story.place : 'Prompt world'}</p>
            <h2 id={headingId}>{world.title}</h2>
          </div>
          <button type="button" ref={menu.pauseButton} onClick={menu.open}>Pause</button>
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
            <h3>Memory complete</h3>
            <p>{story.npc.name}: {reply.answer}</p>
            <p>{story.closing}</p>
            <button type="button" onClick={replay}>Replay visit</button>
          </section>
        )}
        {staticMode && (
          <p className="static-note" role="status">Static preview — the 3D world is unavailable here. Reveal each discovery from the list below.</p>
        )}
        <div key={visit} className={story && !reducedMotion ? `story-stage${ended ? ' story-stage-ended' : ''}` : undefined}>
          <WorldStage world={world} revealed={revealed} ended={ended} position={position} paused={paused || !!storyStep}
            conversationOpen={!!storyStep} audio={{ activeAudio, music }} onReveal={reveal} onFinish={finish} onUnavailable={useStatic} />
        </div>
        <div className="memory-actions">
          <p role="status">{revealed.size} of 2 discoveries found</p>
        </div>
        <WorldSoundtrack value={soundtrack} onChange={changeTrack} onActiveAudio={setActiveAudio} paused={paused}
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
                  <span className="artifact-state">{open ? 'Found' : staticMode ? 'Reveal' : 'Find it in the world'}</span>
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
              <h3>World complete</h3>
              <p>{world.title}</p>
              <button type="button" onClick={replay}>Replay visit</button>
            </div>
          )}
        </footer>
        <details className="interpretation-details">
          <summary>How this world was built</summary>
          {story && (
            <>
              <p>{story.source === 'gemini' ? 'Gemini turned your fictional prompt into the scene description below.' : 'The scene was generated on this device. The conversation is imagined.'}</p>
              {story.originalPrompt !== world.prompt && <blockquote>{story.originalPrompt}</blockquote>}
            </>
          )}
          <InterpretationPanel prompt={world.prompt} interpretation={world.interpretation} />
        </details>
      </article>
      {paused && <PauseMenu {...menu.menu} />}
    </>
  );
}
