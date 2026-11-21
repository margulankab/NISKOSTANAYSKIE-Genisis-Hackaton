import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MemoryViewer } from '../scene/MemoryViewer';
import type { DayBundle } from '../shared/memory-schema';
import { createViewerProps } from '../shared/memory-viewer';
import type { MemoryViewerProps } from '../shared/memory-viewer';
import { dayCheckpointTarget, restoreCheckpoint } from '../world/checkpoint';
import type { GameState } from '../world/checkpoint';
import { loadDayCheckpoint } from './game-repository';
import { localMemories, saveDayProgress } from './indexed-memory-repository';
import { MemoryActions } from './MemoryActions';
import type { DaySummary } from './repository';

function ArchiveCard({ id, title, date, palette, thumbnail }: DaySummary) {
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    if (!thumbnail || !(thumbnail instanceof Blob)) { setPreview(undefined); return; }
    const url = URL.createObjectURL(thumbnail);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);
  const colors = palette?.map(color => `rgb(${color.join(' ')})`) ?? ['#88755e', '#535d51', '#303933'];
  return <li><a href={`/memory/${id}`} className="day-card">
    <span className="day-card-image" aria-hidden="true" style={{ backgroundImage: `linear-gradient(138deg, ${colors.join(',')})` }}>
      {preview && <img src={preview} alt="" onError={() => setPreview(undefined)} />}
    </span>
    <span className="day-card-caption"><time dateTime={date}>{date}</time><strong>{title}</strong></span>
  </a></li>;
}

export function Archive() {
  const [memories, setMemories] = useState<DaySummary[]>();
  const [listError, setListError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string>();
  const [importedId, setImportedId] = useState<string>();

  useEffect(() => {
    let active = true;
    localMemories.list().then((days) => {
      if (active) {
        setMemories(days);
        setListError(false);
      }
    }).catch(() => { if (active) setListError(true); });
    return () => { active = false; };
  }, [refresh]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (importing) return;
    const form = event.currentTarget;
    const file = new FormData(form).get('archive');
    setImportedId(undefined);
    if (!(file instanceof File) || !file.name) {
      setImportError('Choose a memory ZIP to import.');
      return;
    }
    setImportError(undefined);
    setImporting(true);
    try {
      setImportedId(await localMemories.importDay(file));
      form.reset();
      setRefresh((revision) => revision + 1);
    } catch (cause) {
      setImportError(cause instanceof DOMException
        ? 'This browser could not store the imported memory. Check available storage and try again.'
        : cause instanceof Error ? cause.message : 'The memory could not be imported.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="intake archive">
      <h1>Archive</h1>
      <p>Memories are stored in this browser. Export a ZIP to keep a portable copy.</p>
      <form className="archive-import" onSubmit={upload} aria-busy={importing}>
        <label htmlFor="archive-file">Memory ZIP</label>
        <input id="archive-file" name="archive" type="file" accept=".zip,application/zip" disabled={importing} />
        <button type="submit" disabled={importing}>{importing ? 'Importing…' : 'Import ZIP'}</button>
      </form>
      {importedId && <p role="status">Memory available in this archive. <a href={`/memory/${importedId}`}>Open imported memory</a></p>}
      {importError && <p role="alert">{importError}</p>}
      {listError ? <p role="alert">The archive could not be opened. Reload to try again.</p> : (
        !memories ? <p role="status">Opening the archive…</p>
          : memories.length === 0 ? <p>No saved memories yet.</p>
          : <ul className="archive-list" aria-label="Saved memories">
            {memories.map(memory => <ArchiveCard key={memory.id} {...memory} />)}
          </ul>
      )}
    </section>
  );
}

type LoadedMemory = {
  bundle: DayBundle; viewer: MemoryViewerProps; initial?: GameState; checkpointProblem?: string;
};

export function SavedMemory({ id }: { id: string }) {
  const [memory, setMemory] = useState<LoadedMemory | 'missing' | 'error'>();
  const [restart, setRestart] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([localMemories.load(id), loadDayCheckpoint(id)]).then(([bundle, checkpoint]) => {
      if (!active) return;
      if (!bundle) { setMemory('missing'); return; }
      const restored = checkpoint === undefined ? undefined : restoreCheckpoint(dayCheckpointTarget(bundle), checkpoint);
      setMemory({
        bundle, viewer: createViewerProps(bundle, () => {}),
        initial: restored?.ok ? restored.state : undefined,
        checkpointProblem: restored && !restored.ok ? restored.reason : undefined,
      });
    }).catch(() => { if (active) setMemory('error'); });
    return () => { active = false; };
  }, [id]);

  return (
    <section className="intake">
      <a href="/archive">Back to archive</a>
      {!memory ? <p role="status">Opening saved memory…</p>
        : memory === 'missing' ? <p role="alert">This memory was not found in this browser.</p>
        : memory === 'error' ? <p role="alert">This saved memory could not be opened.</p>
        : memory.checkpointProblem && !restart ? (
          <div>
            <h1>{memory.bundle.manifest.title}</h1>
            <p role="alert">{memory.checkpointProblem}</p>
            <button type="button" onClick={() => setRestart(true)}>Restart from the beginning</button>
            <p><a href="/load">Back to Load Game</a></p>
          </div>
        ) : <div className="generated-memory">
          <MemoryViewer {...memory.viewer} game={{ initial: memory.initial, save: (state) => saveDayProgress(memory.bundle, state) }} />
          <MemoryActions bundle={memory.bundle} archived />
        </div>}
    </section>
  );
}
