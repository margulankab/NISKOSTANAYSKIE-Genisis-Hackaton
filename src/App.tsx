import { useEffect, useState } from 'react';
import { Archive, SavedMemory } from './data/Archive';
import { createInMemoryStore } from './data/repository';
import { fixtures, loadFixture } from './fixtures/memories';
import { CreateMemoryForm } from './intake/CreateMemoryForm';
import { LoadGameMenu } from './menus/LoadGameMenu';
import { NewGameMenu } from './menus/NewGameMenu';
import { SettingsMenu } from './menus/SettingsMenu';
import { TitleMenu } from './menus/TitleMenu';
import { installVolumeSetting } from './menus/settings';
import { StatusBar } from './chrome/StatusBar';
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
  | { status: 'ready'; viewer: MemoryViewerProps };

const store = createInMemoryStore();
installVolumeSetting();

export function App() {
  const t = useT();
  const path = window.location.pathname.replace(/\/$/, '') || '/';
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
    '/world-preview': () => <WorldPreview />,
  };

  return (
    <main className="shell">
      <StatusBar />
      <header className="masthead">
        <span className="wordmark">Memory_Worlds<b>.exe</b></span>
        <nav className="site-nav" aria-label="Main">
          <a href="/" aria-current={path === '/' ? 'page' : undefined}>{t('Main menu')}</a>
          <a href="/examples" aria-current={path === '/examples' ? 'page' : undefined}>{t('Examples')}</a>
          <a href="/world-preview" aria-current={path === '/world-preview' ? 'page' : undefined}>{t('World preview')}</a>
          <a href="/create" aria-current={path === '/create' ? 'page' : undefined}>{t('Create a memory')}</a>
          <a href="/archive" aria-current={path === '/archive' ? 'page' : undefined}>{t('Archive')}</a>
        </nav>
        <ViewSwitch />
      </header>
      {memoryPath ? <SavedMemory key={memoryPath[1]} id={memoryPath[1]} />
        : playPath ? <SavedGame key={playPath[1]} id={playPath[1]} />
        : examplePath ? <FixtureLibrary slug={examplePath[1]} />
        : (pages[path] ?? pages['/'])()}
      <WorldWarp />
    </main>
  );
}

function FixtureLibrary({ slug }: { slug?: string }) {
  const [selected, setSelected] = useState(() => fixtures.find(item => item.slug === slug) ?? fixtures[0]);

  return (
    <div className="example-library">
      <nav aria-label="Test memories" className="memory-index">
        <h1>Fixture library</h1>
        <p className="collection">Fictional test memories</p>
        <ul className="example-contact-sheet">
          {fixtures.map((fixture) => (
            <li key={fixture.slug}>
              <button type="button" aria-pressed={fixture === selected} onClick={() => setSelected(fixture)}>
                <span className="day-card-image" aria-hidden="true" style={{ backgroundImage: `url("${fixture.image}")` }} />
                <time dateTime={fixture.date}>{fixture.date}</time>
                <span className="memory-context">{fixture.mood.primary} · {fixture.context.environment}</span>
                <span>{fixture.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p><a href={`/examples/${selected.slug}`}>Link to this example</a></p>
      <FixturePanel key={selected.slug} fixture={selected} />
    </div>
  );
}

function FixturePanel({ fixture }: { fixture: (typeof fixtures)[number] }) {
  const [state, setState] = useState<FixtureState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    async function open() {
      try {
        const bundle = await loadFixture(fixture);
        await store.save(bundle);
        const saved = await store.load(bundle.manifest.id);
        if (!saved) throw new Error('Fixture could not be reopened.');
        if (!disposed) setState({ status: 'ready', viewer: createViewerProps(saved, () => {}) });
      } catch {
        if (!disposed) setState({ status: 'error' });
      }
    }
    void open();
    return () => { disposed = true; };
  }, [fixture, attempt]);

  if (state.status === 'ready') return <MemoryViewer {...state.viewer} />;
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
