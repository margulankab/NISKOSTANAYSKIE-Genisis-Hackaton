import { useEffect, useState } from 'react';
import { createInMemoryStore } from './data/repository';
import { fixtures, loadFixture } from './fixtures/memories';
import { MemoryViewer } from './scene/MemoryViewer';
import { createViewerProps } from './shared/memory-viewer';
import type { MemoryViewerProps } from './shared/memory-viewer';

type FixtureState =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; viewer: MemoryViewerProps };

const store = createInMemoryStore();

export function App() {
  const [selected, setSelected] = useState(fixtures[0]);

  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">Memory Worlds</span>
        <span className="collection">Fictional test memories</span>
      </header>
      <div className="layout">
        <nav aria-label="Test memories" className="memory-index">
          <h1>Fixture library</h1>
          <ul>
            {fixtures.map((fixture) => (
              <li key={fixture.slug}>
                <button type="button" aria-pressed={fixture === selected} onClick={() => setSelected(fixture)}>
                  <span className="memory-context">{fixture.mood.primary} · {fixture.context.environment}</span>
                  <span>{fixture.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <FixturePanel key={selected.slug} fixture={selected} />
      </div>
    </main>
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
