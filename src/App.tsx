import { useEffect, useRef, useState } from 'react';
import { createInMemoryStore } from './data/repository';
import { fixtures, loadFixture } from './fixtures/memories';
import { MemoryStage } from './scene/MemoryStage';
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

  if (state.status === 'ready') return <FixturePreview {...state.viewer} />;
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

function FixturePreview({ manifest, entryText, resolveAsset }: MemoryViewerProps) {
  const [media, setMedia] = useState<{ photo: string; audio: string }>();
  const [mediaError, setMediaError] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioPlayer = useRef<HTMLAudioElement>(null);
  const artifact = manifest.artifacts.find(({ photoId }) => photoId !== null);
  const note = manifest.artifacts.find(({ excerpt }) => excerpt !== null)?.excerpt;
  const photoId = artifact?.photoId ?? manifest.source.photoIds[0];
  const caption = manifest.photos.find(({ assetId }) => assetId === photoId)?.caption;

  useEffect(() => {
    let disposed = false;
    let urls: { photo: string; audio: string } | undefined;
    Promise.all([resolveAsset(photoId), resolveAsset(manifest.source.audioId)]).then(
      ([photo, audio]) => {
        if (disposed) return;
        urls = { photo: URL.createObjectURL(photo), audio: URL.createObjectURL(audio) };
        setMedia(urls);
      },
    ).catch(() => { if (!disposed) setMediaError(true); });
    return () => {
      disposed = true;
      if (urls) {
        URL.revokeObjectURL(urls.photo);
        URL.revokeObjectURL(urls.audio);
      }
    };
  }, [manifest.source.audioId, photoId, resolveAsset]);

  async function togglePlayback() {
    const player = audioPlayer.current;
    if (!player) return;
    setPlaybackError(false);
    if (!player.paused) {
      player.pause();
      return;
    }
    try {
      await player.play();
    } catch {
      setPlaybackError(true);
    }
  }

  return (
    <article className="preview" aria-labelledby="preview-title">
      <header>
        <time dateTime={manifest.date}>{manifest.date}</time>
        <h2 id="preview-title">{manifest.title}</h2>
      </header>
      <MemoryStage manifest={manifest} />
      {mediaError && <p role="alert">The fixture media could not be opened.</p>}
      {media && (
        <>
          <figure>
            <img src={media.photo} alt={caption ?? 'Fixture illustration'} width="480" height="300" />
          </figure>
          <audio ref={audioPlayer} src={media.audio} preload="metadata"
            onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)} onError={() => setPlaybackError(true)} />
        </>
      )}
      {note && <blockquote>{entryText.slice(note.start, note.end)}</blockquote>}
      <button type="button" className="play" disabled={!media} onClick={togglePlayback}>
        {playing ? 'Pause test tone' : 'Play test tone'}
      </button>
      {playbackError && <p role="alert">The test tone could not play.</p>}
    </article>
  );
}
