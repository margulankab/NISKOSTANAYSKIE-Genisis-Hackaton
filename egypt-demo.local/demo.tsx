import { createRoot } from 'react-dom/client';
import { analyzeAudio } from '../src/media/audio-analysis';
import { analyzePhoto } from '../src/media/photo-analysis';
import { MemoryViewer } from '../src/scene/MemoryViewer';
import { dayBundleSchema, resolvePresentation } from '../src/shared/memory-schema';
import { createViewerProps } from '../src/shared/memory-viewer';
import { createArtwork } from './artwork';
import { createSoundtrack } from './soundtrack';
import '../src/styles.css';
import './demo.css';

const title = 'The Drop in Egypt';
const excerpt = 'It was so high and so scary that I thought my heart had stopped.';
const entryText = 'It was my first time in Egypt. I went to a huge water park and tried the Death Drop slide. ' + excerpt;

async function createDemo() {
  const [artwork, audio] = [await createArtwork(), createSoundtrack()];
  const [photoFeatures, music] = await Promise.all([analyzePhoto(artwork), analyzeAudio(audio)]);
  const [entryId, photoId, audioId, frameId, noteId] = Array.from({ length: 5 }, () => crypto.randomUUID());
  const start = entryText.indexOf(excerpt);
  const photo = { assetId: photoId, ...photoFeatures, caption: 'Illustration of the green drop capsule.' };
  const mood = { primary: 'tense', warmth: 0.78, energy: 0.86, tension: 0.91, valence: 0.38 } as const;
  const bundle = dayBundleSchema.parse({
    manifest: {
      id: entryId,
      schemaVersion: 1,
      rulesVersion: 1,
      seed: 62026,
      // The viewer needs a date. This is a preview date and is hidden because the trip date is unknown.
      date: new Date().toISOString().slice(0, 10),
      title,
      generation: { mode: 'rules', model: null, fallbackReason: null },
      source: { entryId, photoIds: [photoId], audioId },
      mood,
      context: { environment: 'park', timeOfDay: 'unknown' },
      photos: [photo],
      music,
      artifacts: [
        { id: frameId, kind: 'frame', photoId, excerpt: null },
        { id: noteId, kind: 'note', photoId: null, excerpt: { start, end: start + excerpt.length } },
      ],
      presentation: resolvePresentation(photo, mood, music.meanEnergy),
    },
    entryText,
    photos: [{ id: photoId, filename: 'drop-capsule.png', mime: 'image/png', blob: artwork }],
    audio: { id: audioId, filename: 'drop-soundscape.wav', mime: 'audio/wav', blob: audio },
    rights: [
      { assetId: photoId, source: 'Original canvas illustration of a drop capsule.', permission: 'Local prototype preview.' },
      { assetId: audioId, source: 'Original synthesized pulse and water rush.', permission: 'Local prototype preview.' },
    ],
  });

  const illustrationUrl = URL.createObjectURL(artwork);
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) URL.revokeObjectURL(illustrationUrl);
  });
  const viewer = createViewerProps(bundle, () => {});

  return (
    <main className="shell egypt-demo">
      <header className="masthead">
        <span className="wordmark">Memory Worlds</span>
        <span className="collection">Local prototype</span>
      </header>
      <section className="demo-intro" aria-labelledby="demo-heading">
        <div>
          <h1 id="demo-heading">My first time in Egypt</h1>
          <p>{entryText}</p>
        </div>
        <img src={illustrationUrl} alt="An empty green drop capsule high above a curving water slide" width={960} height={600} />
      </section>
      <MemoryViewer {...viewer} />
    </main>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<main className="shell"><p role="status">Opening the waterpark memory…</p></main>);
void createDemo().then(
  (view) => root.render(view),
  (error) => {
    console.error(error);
    root.render(<main className="shell"><p role="alert">The demo could not open. Reload to try again.</p></main>);
  },
);
