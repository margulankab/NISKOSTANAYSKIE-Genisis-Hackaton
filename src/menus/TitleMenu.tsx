import { useEffect, useState } from 'react';
import { gamePath, latestGame, localGames } from '../data/game-repository';
import type { GameSummary } from '../data/game-repository';
import { PixelLink } from '../chrome/PixelLink';
import { useT } from '../i18n/i18n';
import { MemoryCard } from '../library/MemoryCard';
import { useLibrary } from '../library/Library';

/** Each letter of the title rises into place, one after another. */
function Lettered({ text, from = 0 }: { text: string; from?: number }) {
  return <>{[...text].map((char, i) => <span key={i} className="title-letter" style={{ '--l': from + i } as React.CSSProperties}>{char}</span>)}</>;
}

export function TitleMenu() {
  const t = useT();
  const [latest, setLatest] = useState<GameSummary | null | 'loading' | 'error'>('loading');
  const { own, examples } = useLibrary();

  useEffect(() => {
    let disposed = false;
    latestGame(localGames).then(
      (game) => { if (!disposed) setLatest(game ?? null); },
      () => { if (!disposed) setLatest('error'); },
    );
    return () => { disposed = true; };
  }, []);

  const canContinue = latest !== null && typeof latest === 'object';
  // Showcase: your three latest memories, topped up with example days.
  const showcase = [...(Array.isArray(own) ? own : []), ...examples].slice(0, 3);
  return (
    <section className="title-menu">
      <div className="title-copy">
        <h1 className="title" aria-label="Memory Worlds">
          <span className="row t1" aria-hidden="true"><Lettered text="Memory" /></span>
          <span className="row t2" aria-hidden="true"><Lettered text="worlds" from={6} /></span>
        </h1>
        <p className="title-lede">{t('Write what happened, add a photo and the song that was playing. The day becomes a small world you can explore, save, and come back to.')}</p>
        <nav aria-label={t('Title menu')}>
          <ul className="pb-grid">
            <PixelLink main href="/new" icon="play" label={t('New Game')} hint={t('From words, or from a day you remember')} />
            {canContinue
              ? <PixelLink href={gamePath(latest)} icon="tape" tone="violet" label={t('Continue')} hint={`${latest.title}, ${latest.status}`} />
              : <PixelLink disabled icon="tape" tone="violet" label={t('Continue')} hint={t(latest === 'loading' ? 'Checking saves…' : latest === 'error' ? 'Saves are unavailable in this browser' : 'No saved game yet')} />}
            <PixelLink href="/load" icon="folder" tone="pink" label={t('Load Game')} hint={t('Every world and day you saved')} />
            <PixelLink href="/library" icon="frames" label={t('Library')} hint={t('Your memories and five example days')} />
          </ul>
        </nav>
      </div>
      <aside className="title-showcase" aria-label={t('From the library')}>
        <ul className="memory-fan">
          {showcase.map((item, index) => <MemoryCard key={item.kind + item.id} item={item} index={index} label={t} />)}
        </ul>
        <a className="title-showcase-link" href="/library">{t('Open the memory library')}</a>
      </aside>
    </section>
  );
}
