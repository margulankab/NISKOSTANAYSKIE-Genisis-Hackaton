import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { currentPath, installHashLinks, subscribeToRoute } from './chrome/route';
import { Archive, SavedMemory } from './data/Archive';
import { createInMemoryStore } from './data/repository';
import { fixtures, loadFixture, playableFixture } from './fixtures/memories';
import { enterWorld } from './chrome/immersive';
import type { DayBundle } from './shared/memory-schema';
import { CreateMemoryForm } from './intake/CreateMemoryForm';
import { LoadGameMenu } from './menus/LoadGameMenu';
import { NewGameMenu } from './menus/NewGameMenu';
import { SettingsMenu } from './menus/SettingsMenu';
import { TitleMenu } from './menus/TitleMenu';
import { installVolumeSetting } from './menus/settings';
import { Library } from './library/Library';
import { MiniPlayer, MusicButton } from './music/MusicApps';
import { ViewSwitch } from './chrome/ViewSwitch';
import { WorldWarp } from './chrome/WorldWarp';
import { useT } from './i18n/i18n';
import { NewPromptGame } from './world/NewPromptGame';
import { SavedGame } from './world/SavedGame';
import { MemoryViewer } from './scene/MemoryViewer';
import { WorldPreview } from './scene/WorldPreview';
import { createViewerProps } from './shared/memory-viewer';
import type { MemoryViewerProps } from './shared/memory-viewer';

type FixtureState =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; viewer: MemoryViewerProps; bundle: DayBundle };

const store = createInMemoryStore();
installVolumeSetting();
installHashLinks();

export function App() {
  const t = useT();
  const path = useSyncExternalStore(subscribeToRoute, currentPath);
  const memoryPath = path.match(/^\/memory\/([^/]+)$/);
  const playPath = path.match(/^\/play\/([^/]+)$/);
  const examplePath = path.match(/^\/examples\/([a-z-]+)$/);
  const pages: Record<string, () => React.JSX.Element> = {
    '/': () => <TitleMenu />,
    '/examples': () => <FixtureLibrary />,
    '/new': () => <NewGameMenu />,
    '/new/prompt': () => <NewPromptGame />,
    '/create': () => <CreateMemoryForm />,
    '/archive': () => <Archive />,
    '/load': () => <LoadGameMenu />,
    '/settings': () => <SettingsMenu />,
    '/library': () => <Library />,
    '/world-preview': () => <WorldPreview />,
  };

  return (
    <main className="shell">
      <header className="masthead">
        <a className="wordmark" href="/" aria-label={t('Main menu')}>Memory<b>.worlds</b></a>
        <nav className="site-nav" aria-label="Main">
          <a href="/library" aria-current={path === '/library' ? 'page' : undefined}>{t('Library')}</a>
          <a href="/new" aria-current={path.startsWith('/new') ? 'page' : undefined}>{t('New game')}</a>
          <a href="/settings" aria-current={path === '/settings' ? 'page' : undefined}>{t('Settings')}</a>
        </nav>
        <div className="masthead-tools"><MusicButton /><ViewSwitch /></div>
      </header>
      <Fragment key={path}>
      {memoryPath ? <SavedMemory key={memoryPath[1]} id={memoryPath[1]} />
        : playPath ? <SavedGame key={playPath[1]} id={playPath[1]} />
        : examplePath ? <FixtureLibrary slug={examplePath[1]} />
        : (pages[path] ?? pages['/'])()}
      </Fragment>
      <WorldWarp />
      <MiniPlayer />
    </main>
  );
}

function FixtureLibrary({ slug }: { slug?: string }) {
  const t = useT();
  const [selected, setSelected] = useState(() => fixtures.find(item => item.slug === slug) ?? fixtures[0]);

  return (
    <div className="example-library">
      <nav aria-label="Test memories" className="memory-index">
        <h1>{t('Example days')}</h1>
        <p className="collection">{t('Five fictional days to walk through')}</p>
        <ul className="example-contact-sheet">
          {fixtures.map((fixture) => (
            <li key={fixture.slug}>
              <button type="button" aria-pressed={fixture === selected} onClick={() => setSelected(fixture)}>
                <span className="day-card-image" aria-hidden="true" style={{ backgroundImage: `url("${fixture.image}")` }} />
                <time dateTime={fixture.date}>{fixture.date}</time>
                <span className="memory-context">{t(fixture.mood.primary)} · {t(fixture.context.environment)}</span>
                <span>{t(fixture.title)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p className="example-links"><a href={`/examples/${selected.slug}`}>{t('Link to this example')}</a> <a href="/create">{t('Create a memory')}</a></p>
      <FixturePanel key={selected.slug} fixture={selected} />
    </div>
  );
}

function FixturePanel({ fixture }: { fixture: (typeof fixtures)[number] }) {
  const t = useT();
  const [state, setState] = useState<FixtureState>({ status: 'loading' });
  const [world, setWorld] = useState<MemoryViewerProps | null>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    async function open() {
      try {
        const bundle = await loadFixture(fixture);
        await store.save(bundle);
        const saved = await store.load(bundle.manifest.id);
        if (!saved) throw new Error('Fixture could not be reopened.');
        if (!disposed) setState({ status: 'ready', viewer: createViewerProps(saved, () => {}), bundle: saved });
      } catch {
        if (!disposed) setState({ status: 'error' });
      }
    }
    void open();
    return () => { disposed = true; };
  }, [fixture, attempt]);

  if (state.status === 'ready') {
    if (world) return <MemoryViewer key="world" {...world} entered />;
    // The preview above is the example's diorama; Enter world opens it as a full world, like a day made in Create.
    const enter = () => {
      const playable = playableFixture(state.bundle, fixture);
      const { manifest } = playable;
      enterWorld({
        words: playable.entryText, title: t(manifest.title), from: enterButton.current,
        lines: [
          t('reading your words'),
          t('placing {count} objects', { count: manifest.artifacts.length + manifest.photos.length }),
          t('tuning soundtrack: {track}', { track: playable.audio.filename.replace(/\.wav$/, '') }),
          t('opening the world'),
        ],
      });
      setWorld(createViewerProps(playable, () => {}));
    };
    return (
      <>
        <div className="prompt-actions example-enter">
          <button type="button" className="enter-world" ref={enterButton} onClick={enter}>{t('Enter world')}</button>
        </div>
        <MemoryViewer {...state.viewer} />
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <section className="preview">
        <p role="alert">This fixture could not be opened.</p>
        <button type="button" onClick={() => {
          setState({ status: 'loading' });
          setAttempt(attempt + 1);
        }}>Try again</button>
      </section>
    );
  }
  return <p role="status">Opening {fixture.title}…</p>;
}
