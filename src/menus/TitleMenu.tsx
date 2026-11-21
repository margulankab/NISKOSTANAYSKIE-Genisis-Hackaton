import { useEffect, useState } from 'react';
import { gamePath, latestGame, localGames } from '../data/game-repository';
import type { GameSummary } from '../data/game-repository';

export function TitleMenu() {
  const [latest, setLatest] = useState<GameSummary | null | 'loading' | 'error'>('loading');

  useEffect(() => {
    let disposed = false;
    latestGame(localGames).then(
      (game) => { if (!disposed) setLatest(game ?? null); },
      () => { if (!disposed) setLatest('error'); },
    );
    return () => { disposed = true; };
  }, []);

  const canContinue = latest !== null && typeof latest === 'object';
  return (
    <section className="intake menu title-menu">
      <h1>Memory Worlds</h1>
      <p>Walk through low-poly worlds built from a description or from a day you remember.</p>
      <nav aria-label="Title menu" className="menu-list">
        <a className="menu-item" href="/new">New Game</a>
        {canContinue
          ? <a className="menu-item" href={gamePath(latest)}>Continue <span>{latest.title} · {latest.status}</span></a>
          : <span className="menu-item" aria-disabled="true">Continue <span>{latest === 'loading' ? 'Checking saves…' : latest === 'error' ? 'Saves are unavailable in this browser' : 'No saved game yet'}</span></span>}
        <a className="menu-item" href="/load">Load Game</a>
        <a className="menu-item" href="/examples">Examples</a>
        <a className="menu-item" href="/settings">Settings</a>
      </nav>
    </section>
  );
}
