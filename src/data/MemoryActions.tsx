import { useState } from 'react';
import type { DayBundle } from '../shared/memory-schema';
import { exportBundle } from './day-zip';
import { localMemories } from './indexed-memory-repository';

export function MemoryActions({ bundle, archived = false }: { bundle: DayBundle; archived?: boolean }) {
  const [pending, setPending] = useState<'save' | 'export'>();
  const [saved, setSaved] = useState(archived);
  const [error, setError] = useState<string>();
  const { id, title } = bundle.manifest;

  async function save() {
    if (pending || saved) return;
    setPending('save');
    setError(undefined);
    try {
      await localMemories.save(bundle);
      setSaved(true);
    } catch (cause) {
      const detail = cause instanceof DOMException && cause.name === 'QuotaExceededError'
        ? 'This browser’s archive storage is full.' : 'The memory could not be saved to this browser.';
      setError(`${detail} You can still export a ZIP.`);
    } finally {
      setPending(undefined);
    }
  }

  async function download() {
    if (pending) return;
    setPending('export');
    setError(undefined);
    try {
      const zip = archived ? await localMemories.exportDay(id) : await exportBundle(bundle);
      const url = URL.createObjectURL(zip);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title}.zip`;
        document.body.append(link);
        try { link.click(); } finally { link.remove(); }
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setError('The ZIP could not be exported. Try again.');
    } finally {
      setPending(undefined);
    }
  }

  return (
    <div className="memory-actions" aria-busy={Boolean(pending)}>
      {!saved && <button type="button" onClick={save} disabled={Boolean(pending)}>
        {pending === 'save' ? 'Saving…' : 'Save to archive'}
      </button>}
      <button type="button" onClick={download} disabled={Boolean(pending)}>
        {pending === 'export' ? 'Exporting…' : 'Export ZIP'}
      </button>
      {saved && !archived && <p role="status">Saved to this browser. <a href={`/memory/${id}`}>Open saved memory</a></p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
