import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Point } from '../gameplay/layout';
import { localGames } from '../data/game-repository';
import type { GameRepository } from '../data/game-repository';
import { createCheckpoint } from './checkpoint';
import type { GameState } from './checkpoint';
import { InterpretationPanel } from './InterpretationPanel';
import { PauseMenu } from './PauseMenu';
import type { SaveStatus } from './PauseMenu';
import { WorldStage, labelFor } from './WorldStage';
import type { PromptWorld } from './world-schema';

const snapshot = ({ position, revealed, ended }: GameState) =>
  JSON.stringify([Math.round(position.x * 10), Math.round(position.z * 10), [...revealed].sort(), ended]);

function reasonOf(error: unknown) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'this browser is out of storage space';
  return error instanceof Error && error.message ? error.message : 'storage is unavailable';
}

/** One play session of a prompt world: walking, discoveries, ending, pause menu and saving. */
export function GameSession({ world, initial, saved, repository = localGames, leave = () => window.location.assign('/') }: {
  world: PromptWorld;
  /** Restored checkpoint state, or null to start at spawn. */
  initial: GameState | null;
  /** Whether this world already exists in local storage. */
  saved: boolean;
  repository?: GameRepository;
  leave?: () => void;
}) {
  const headingId = useId();
  const position = useRef<Point>(initial?.position ?? world.layout.spawn);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => initial?.revealed ?? new Set());
  const [ended, setEnded] = useState(initial?.ended ?? false);
  const [visit, setVisit] = useState(0);
  const [paused, setPaused] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [save, setSave] = useState<SaveStatus>({ status: 'idle' });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const lastSaved = useRef<string | null>(saved && initial ? snapshot(initial) : null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const discoveries = world.layout.discoveries;

  const reveal = useCallback((id: string) => {
    setRevealed((previous) => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);
  const finish = useCallback(() => { if (revealed.size >= 2) setEnded(true); }, [revealed]);
  const useStatic = useCallback(() => setStaticMode(true), []);

  function resume() {
    setPaused(false);
    setConfirmLeave(false);
    setSave({ status: 'idle' });
    requestAnimationFrame(() => pauseButton.current?.focus());
  }

  async function saveGame() {
    const state = { position: position.current, revealed, ended };
    setSave({ status: 'saving' });
    try {
      await repository.saveGame(world, createCheckpoint(world, state));
      lastSaved.current = snapshot(state);
      setSave({ status: 'saved', message: 'Game saved in this browser.' });
      return true;
    } catch (error) {
      setSave({ status: 'error', message: `The game could not be saved because ${reasonOf(error)}. Your world is still open, so you can try again.` });
      return false;
    }
  }

  function toMainMenu() {
    if (lastSaved.current === snapshot({ position: position.current, revealed, ended })) leave();
    else setConfirmLeave(true);
  }

  function replay() {
    position.current = world.layout.spawn;
    setRevealed(new Set());
    setEnded(false);
    setVisit((count) => count + 1);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      event.preventDefault();
      if (!paused) { setPaused(true); return; }
      if (confirmLeave) setConfirmLeave(false);
      else resume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <article className="preview game-session" aria-labelledby={headingId}>
      <header className="game-header">
        <div>
          <p className="memory-context">Prompt world</p>
          <h2 id={headingId}>{world.title}</h2>
        </div>
        <button type="button" ref={pauseButton} onClick={() => setPaused(true)}>Pause</button>
      </header>
      {staticMode && (
        <p className="static-note" role="status">Static preview — the 3D world is unavailable here. Reveal each discovery from the list below.</p>
      )}
      <WorldStage key={visit} world={world} revealed={revealed} ended={ended} position={position} paused={paused}
        onReveal={reveal} onFinish={finish} onUnavailable={useStatic} />
      <div className="memory-actions">
        <p role="status">{revealed.size} of 2 discoveries found</p>
        <p className="soundtrack-note">Soundtrack: none selected yet. This world is silent.</p>
      </div>
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
            </section>
          );
        })}
      </div>
      <footer className="memory-ending">
        {staticMode && !ended && <button type="button" disabled={revealed.size < 2} onClick={finish}>Finish world</button>}
        {ended && (
          <div className="closing-card" role="status">
            <h3>World complete</h3>
            <p>{world.title}</p>
            <button type="button" onClick={replay}>Replay visit</button>
          </div>
        )}
      </footer>
      <details className="interpretation-details">
        <summary>How this world was built</summary>
        <InterpretationPanel prompt={world.prompt} interpretation={world.interpretation} />
      </details>
      {paused && (
        <PauseMenu save={save} confirmLeave={confirmLeave} onResume={resume} onSave={() => void saveGame()}
          onSaveAndQuit={() => void saveGame().then((ok) => { if (ok) leave(); })}
          onMainMenu={toMainMenu} onLeaveWithoutSaving={leave} onCancelLeave={() => setConfirmLeave(false)} />
      )}
    </article>
  );
}
