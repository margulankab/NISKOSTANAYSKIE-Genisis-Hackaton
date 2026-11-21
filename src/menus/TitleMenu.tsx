import { useEffect, useState } from 'react';
import { gamePath, latestGame, localGames } from '../data/game-repository';
import type { GameSummary } from '../data/game-repository';
import { PixelLink } from '../chrome/PixelLink';
import { TitleTape } from './TitleTape';
import { useT } from '../i18n/i18n';

const TICKER = ['Write the day', 'Add a photo', 'Link the song', 'Walk inside it', 'Find two memories', 'Save it', 'Come back any time'];

export function TitleMenu() {
  const t = useT();
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
    <section className="title-menu">
      <div className="title-copy">
        <p className="cmd" aria-hidden="true">&gt; ./memory_worlds --remember<span className="cur" /></p>
        <h1 className="title" aria-label="Memory Worlds"><span className="row t1">Memory</span><span className="row t2">.worlds</span></h1>
        <p className="tags" aria-hidden="true"><span>Text</span><span>Photo</span><span>Song</span><span>Walk</span></p>
        <p className="title-lede">{t('Write what happened, add a photo and the song that was playing. The day becomes a small world you can explore, save, and come back to.')}</p>
        <nav aria-label={t('Title menu')}>
          <ul className="pb-grid">
            <PixelLink main href="/new" icon="play" label={t('New Game')} hint={t('From words, or from a day you remember')} />
            {canContinue
              ? <PixelLink href={gamePath(latest)} icon="tape" tone="violet" label={t('Continue')} hint={`${latest.title}, ${latest.status}`} />
              : <PixelLink disabled icon="tape" tone="violet" label={t('Continue')} hint={t(latest === 'loading' ? 'Checking saves…' : latest === 'error' ? 'Saves are unavailable in this browser' : 'No saved game yet')} />}
            <PixelLink href="/load" icon="folder" tone="pink" label={t('Load Game')} hint={t('Every world and day you saved')} />
            <PixelLink href="/examples" icon="frames" label={t('Examples')} hint={t('Five fictional days')} />
            <PixelLink href="/settings" icon="gear" tone="violet" label={t('Settings')} hint={t('Volume, motion, language and atmosphere')} />
          </ul>
        </nav>
      </div>
      <aside className="win title-side" data-win="side_a.exe" aria-label={t('Latest tape')}>
        <TitleTape label={canContinue ? latest.title : 'The last light in the park'} />
        <p className="title-side-note">{t(canContinue ? 'Your latest save. Continue to walk back in.' : 'Example day. Your own days will appear on this tape.')}</p>
      </aside>
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">{[...TICKER, ...TICKER].map((item, index) => <span key={index}>{t(item)}</span>)}</div>
      </div>
    </section>
  );
}
