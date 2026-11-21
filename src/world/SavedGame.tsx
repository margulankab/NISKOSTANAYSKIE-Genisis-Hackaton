import { useEffect, useState } from 'react';
import { localGames } from '../data/game-repository';
import { restoreCheckpoint } from './checkpoint';
import type { GameState } from './checkpoint';
import { GameSession } from './GameSession';
import type { PromptWorld } from './world-schema';

type Opened =
  | { status: 'loading' | 'missing' | 'error' }
  | { status: 'ready'; world: PromptWorld; initial: GameState | null; problem: string | null };

/** Reopen a saved prompt world from its stored layout and checkpoint, without re-parsing the prompt. */
export function SavedGame({ id }: { id: string }) {
  const [opened, setOpened] = useState<Opened>({ status: 'loading' });
  const [restart, setRestart] = useState(false);

  useEffect(() => {
    let disposed = false;
    localGames.loadGame(id).then((saved) => {
      if (disposed) return;
      if (!saved) { setOpened({ status: 'missing' }); return; }
      const restored = saved.checkpoint === undefined ? null : restoreCheckpoint(saved.world, saved.checkpoint);
      setOpened(restored?.ok
        ? { status: 'ready', world: saved.world, initial: restored.state, problem: null }
        : { status: 'ready', world: saved.world, initial: null, problem: restored ? restored.reason : 'No saved progress was found.' });
    }, () => { if (!disposed) setOpened({ status: 'error' }); });
    return () => { disposed = true; };
  }, [id]);

  if (opened.status === 'loading') return <p role="status">Opening saved world…</p>;
  if (opened.status === 'missing') return <section className="intake"><p role="alert">This world was not found in this browser.</p><p><a href="/load">Load Game</a></p></section>;
  if (opened.status !== 'ready') return <section className="intake"><p role="alert">This saved world could not be opened.</p><p><a href="/load">Load Game</a></p></section>;
  if (opened.problem && !restart) {
    return (
      <section className="intake">
        <h1>{opened.world.title}</h1>
        <p role="alert">{opened.problem}</p>
        <div className="prompt-actions">
          <button type="button" onClick={() => setRestart(true)}>Restart from the beginning</button>
          <a className="back-link" href="/load">Back to Load Game</a>
        </div>
      </section>
    );
  }
  return <GameSession world={opened.world} initial={opened.initial} saved />;
}
