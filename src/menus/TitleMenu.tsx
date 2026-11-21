import { useEffect, useState } from 'react';
import { latestGame, localGames } from '../data/game-repository';
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
      <p className="eyebrow">A walkable diary</p>
      <h1>Memory Worlds</h1>
      <p className="lede">Walk through low-poly worlds built from a description or from a day you remember.</p>
      <nav aria-label="Title menu" className="menu-list">
        <a className="menu-item menu-item-primary" href="/new">New Game <span>Build a world from words or from a day</span></a>
        {canContinue
          ? <a className="menu-item" href={'/play/' + latest.id}>Continue <span>{latest.title} · {latest.status}</span></a>
          : <span className="menu-item" aria-disabled="true">Continue <span>{latest === 'loading' ? 'Checking saves…' : latest === 'error' ? 'Saves are unavailable in this browser' : 'No saved game yet'}</span></span>}
        <a className="menu-item" href="/load">Load Game <span>Saved worlds and day memories</span></a>
        <a className="menu-item" href="/examples">Examples <span>Three fictional memories to walk through</span></a>
        <a className="menu-item" href="/settings">Settings <span>Volume and motion</span></a>
      </nav>
    </section>
  );
}
