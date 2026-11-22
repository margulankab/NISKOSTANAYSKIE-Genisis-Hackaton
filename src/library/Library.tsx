import { useEffect, useState } from 'react';
import { gamePath, localGames } from '../data/game-repository';
import { localMemories } from '../data/indexed-memory-repository';
import { fixtures } from '../fixtures/memories';
import { useT } from '../i18n/i18n';
import { MemoryCard, WorldArt } from './MemoryCard';
import type { LibraryItem } from './MemoryCard';

const examples: LibraryItem[] = fixtures.map((fixture) => ({
  id: fixture.slug, kind: 'example', title: fixture.title, href: `/examples/${fixture.slug}`,
  meta: `${fixture.date} · ${fixture.mood.primary} · ${fixture.context.environment}`, image: fixture.image,
  timeOfDay: fixture.context.timeOfDay,
}));

/** Everything saved in this browser (newest first), followed by the five example days. */
export function useLibrary() {
  const [own, setOwn] = useState<LibraryItem[] | 'loading' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    Promise.all([localGames.listGames(), localMemories.list()]).then(([games, days]) => {
      const thumbnails = new Map(days.map((day) => [day.id, day]));
      const items = games.map((game): LibraryItem => {
        const day = game.kind === 'day' ? thumbnails.get(game.id) : undefined;
        return {
          id: game.id, kind: game.kind === 'day' ? 'day' : 'world', title: game.title, href: gamePath(game),
          meta: game.kind === 'day' ? game.status.replace(/^Day memory · /, '') : game.status,
          image: day?.thumbnail instanceof Blob ? day.thumbnail : undefined,
          timeOfDay: game.timeOfDay, weather: game.weather,
        };
      });
      if (active) setOwn(items);
    }, () => { if (active) setOwn('error'); });
    return () => { active = false; };
  }, []);
  return { own, examples };
}

type Filter = 'all' | 'world' | 'day' | 'example';

export function Library() {
  const t = useT();
  const { own, examples: shown } = useLibrary();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const mine = Array.isArray(own) ? own : [];
  const needle = query.trim().toLowerCase();
  const items = [...mine, ...shown]
    .filter((item) => filter === 'all' || item.kind === filter)
    .filter((item) => !needle || `${item.title} ${item.meta}`.toLowerCase().includes(needle));
  const featured = mine[0];
  const filters: [Filter, string][] = [['all', 'All'], ['world', 'Worlds'], ['day', 'Days'], ['example', 'Examples']];
  return (
    <section className="library" aria-labelledby="library-title">
      <header className="library-head">
        <div className="library-title">
          <h1 id="library-title">{t('Memory library')}</h1>
          <svg className="library-horizon" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 30 L60 22 L110 27 L170 12 L230 24 L290 8 L350 22 L410 16 L470 26 L530 14 L600 24" />
          </svg>
          <p className="library-lede">{t('Every world and day you have made in this browser, and five example days to start from.')}</p>
        </div>
        <nav className="library-actions" aria-label={t('Library actions')}>
          <a className="button-link" href="/new">{t('New game')}</a>
          <a href="/create">{t('Create a memory')}</a>
          <a href="/archive">{t('Archive')}</a>
        </nav>
      </header>
      {featured && !needle && filter === 'all' && (
        <a className="library-featured" href={featured.href}>
          <span className="library-featured-art"><WorldArt seed={featured.id} timeOfDay={featured.timeOfDay} weather={featured.weather} /></span>
          <span className="library-featured-text">
            <span className="library-featured-kicker">{t('Last saved')}</span>
            <strong>{featured.title}</strong>
            <span>{featured.meta}</span>
            <span className="library-featured-go">{t('Continue')} ▸</span>
          </span>
        </a>
      )}
      <div className="library-tools">
      <label className="library-search">
        <span className="visually-hidden">{t('Search memories')}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search memories')} />
      </label>
      <div className="library-filters" role="group" aria-label={t('Show')}>
        {filters.map(([value, name]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {t(name)}<span>{value === 'all' ? mine.length + shown.length : [...mine, ...shown].filter((item) => item.kind === value).length}</span>
          </button>
        ))}
      </div>
      </div>
      {own === 'loading' && <p role="status">{t('Opening your saves…')}</p>}
      {own === 'error' && <p role="alert">{t('Saves are unavailable in this browser')}</p>}
      {Array.isArray(own) && own.length === 0 && (filter === 'all' || filter === 'world' || filter === 'day') && (
        <p className="empty-state">{t('Nothing saved yet. Build a world from a few words, or turn a day into a memory: it will appear here.')}</p>
      )}
      {items.length === 0 && needle && <p className="empty-state">{t('No memory matches “{query}”.', { query })}</p>}
      <ul className="memory-shelf" aria-label={t('Memories')} key={filter + needle}>
        {items.map((item, index) => <MemoryCard key={item.kind + item.id} item={item} index={index} label={t} />)}
      </ul>
    </section>
  );
}
