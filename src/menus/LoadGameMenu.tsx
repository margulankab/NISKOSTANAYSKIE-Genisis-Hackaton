import { useEffect, useState } from 'react';
import { gamePath, localGames } from '../data/game-repository';
import type { GameSummary } from '../data/game-repository';
import { useT } from '../i18n/i18n';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function LoadGameMenu() {
  const t = useT();
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
    <section className="intake menu" data-win="load_game.exe">
      <h1>{t('Load Game')}</h1>
      {games === 'loading' && <p role="status">{t('Opening saves…')}</p>}
      {games === 'error' && <p role="alert">{t('Saved games are unavailable in this browser.')}</p>}
      {Array.isArray(games) && games.length === 0 && (
        <div className="empty-state">
          <p>{t('No saved worlds or day memories in this browser yet.')}</p>
          <a className="button-link" href="/new">{t('Start a new game')}</a>
        </div>
      )}
      {Array.isArray(games) && games.length > 0 && (
        <ul className="menu-list" aria-label="Saved games">
          {games.map((game) => (
            <li key={game.kind + ':' + game.id}>
              <a className="menu-item" href={gamePath(game)}>
                {game.title}
                <span>{`${game.status}${game.savedAt ? ' · ' + t('saved {when}', { when: when(game.savedAt) }) : ''}`}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a className="back-link" href="/">{t('Back to main menu')}</a>
    </section>
  );
}
