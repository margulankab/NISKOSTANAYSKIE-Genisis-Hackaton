import { useEffect, useState } from 'react';
import { localGames } from '../data/game-repository';
import type { GameSummary } from '../data/game-repository';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function LoadGameMenu() {
  const [games, setGames] = useState<GameSummary[] | 'loading' | 'error'>('loading');

  useEffect(() => {
    let disposed = false;
    localGames.listGames().then(
      (list) => { if (!disposed) setGames(list); },
      () => { if (!disposed) setGames('error'); },
    );
    return () => { disposed = true; };
  }, []);

  return (
    <section className="intake menu">
      <h1>Load Game</h1>
      {games === 'loading' && <p role="status">Opening saves…</p>}
      {games === 'error' && <p role="alert">Saved games are unavailable in this browser.</p>}
      {Array.isArray(games) && games.length === 0 && (
        <div className="empty-state">
          <p>No saved worlds or day memories in this browser yet.</p>
          <a className="button-link" href="/new">Start a new game</a>
        </div>
      )}
      {Array.isArray(games) && games.length > 0 && (
        <ul className="menu-list" aria-label="Saved games">
          {games.map((game) => (
            <li key={game.id}>
              <a className="menu-item" href={(game.kind === 'day' ? '/memory/' : '/play/') + game.id}>
                {game.title}
                <span>{game.kind === 'day' ? game.status : `${game.status}${game.savedAt ? ' · saved ' + when(game.savedAt) : ''}`}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a className="back-link" href="/">Back to main menu</a>
    </section>
  );
}
