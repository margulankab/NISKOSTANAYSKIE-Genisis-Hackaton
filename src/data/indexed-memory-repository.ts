import { dayBundleSchema } from '../shared/memory-schema';
import type { DayBundle } from '../shared/memory-schema';
import { exportBundle, importBundle } from './day-zip';
import { createCheckpoint, dayCheckpointTarget, restoreCheckpoint } from '../world/checkpoint';
import type { Checkpoint, GameState } from '../world/checkpoint';
import type { MemoryRepository } from './repository';

const databaseName = 'memory-worlds';
const days = 'days';
const media = 'media';
/** Version 2 adds prompt worlds and their local checkpoints; version 1 day records are untouched. */
export const worldsStore = 'worlds';
export const checkpointsStore = 'checkpoints';
export const dayCheckpointKey = (id: string) => 'day:' + id;
type StoredDay = Pick<DayBundle, 'manifest' | 'entryText' | 'rights' | 'world' | 'song'> & { fingerprint: string };
type StoredMedia = Pick<DayBundle, 'photos' | 'audio' | 'thumbnail'>;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      reject(new Error('The archive is busy in another tab. Close that tab and retry.'));
    };
    request.onupgradeneeded = ({ oldVersion }) => {
      if (oldVersion < 1) {
        request.result.createObjectStore(days);
        request.result.createObjectStore(media);
      }
      if (oldVersion < 2) {
        request.result.createObjectStore(worldsStore);
        request.result.createObjectStore(checkpointsStore);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

export function resultOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function transact<T>(stores: string[], mode: IDBTransactionMode, operation: (tx: IDBTransaction) => Promise<T>) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(stores, mode);
    const committed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error('The archive transaction was interrupted.'));
    });
    try {
      const run = async () => operation(tx);
      const [result] = await Promise.all([run(), committed]);
      return result;
    } catch (error) {
      // Covers synchronous write failures and application errors as well as request errors.
      try { tx.abort(); } catch { /* The transaction already ended. */ }
      await committed.catch(() => {});
      throw error;
    }
  } finally {
    db.close();
  }
}

async function fingerprint({ manifest, entryText, rights, photos, audio, thumbnail, world, song }: DayBundle) {
  async function digest(blob: Blob) {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
    return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  const assets = [];
  for (const { id, mime, filename, blob } of [...photos, audio]) {
    assets.push({ id, mime, filename, digest: await digest(blob) });
  }
  const preview = thumbnail ? await digest(thumbnail) : null;
  // JSON keys come from the validated schema. Preserve array order as part of the bundle.
  return digest(new Blob([JSON.stringify({ manifest, entryText, rights, assets, preview, ...(world && { world }), ...(song && { song }) })]));
}

async function saveDay(bundle: DayBundle, checkpoint?: Checkpoint) {
  const validated = dayBundleSchema.parse(bundle);
  const { manifest, entryText, rights, photos, audio, thumbnail, world, song } = validated;
  if (checkpoint && !restoreCheckpoint(dayCheckpointTarget(validated), checkpoint).ok) {
    throw new Error('The checkpoint does not match this day memory.');
  }
  const day: StoredDay = { manifest, entryText, rights, world, ...(song && { song }), fingerprint: await fingerprint(validated) };
  const assets: StoredMedia = { photos, audio, thumbnail };
  await transact(checkpoint ? [days, media, checkpointsStore] : [days, media], 'readwrite', async (tx) => {
    const table = tx.objectStore(days);
    const existing: StoredDay | undefined = await resultOf(table.get(manifest.id));
    if (existing && existing.fingerprint !== day.fingerprint) throw new Error('A different memory already uses this ID.');
    const writes: IDBRequest<IDBValidKey>[] = [];
    if (!existing) writes.push(table.add(day, manifest.id), tx.objectStore(media).add(assets, manifest.id));
    if (checkpoint) writes.push(tx.objectStore(checkpointsStore).put(checkpoint, dayCheckpointKey(manifest.id)));
    await Promise.all(writes.map(resultOf));
  });
}

export function saveDayProgress(bundle: DayBundle, state: GameState) {
  return saveDay(bundle, createCheckpoint(dayCheckpointTarget(bundle), state));
}

async function load(id: string): Promise<DayBundle | undefined> {
  const [day, assets]: [StoredDay | undefined, StoredMedia | undefined] = await transact([days, media], 'readonly', (tx) =>
    Promise.all([resultOf(tx.objectStore(days).get(id)), resultOf(tx.objectStore(media).get(id))]));
  if (!day && !assets) return undefined;
  if (!day || !assets) throw new Error('This stored memory is missing its day or media records.');
  const { manifest, entryText, rights, world, song } = day;
  return dayBundleSchema.parse({ manifest, entryText, rights, ...(world && { world }), ...(song && { song }), ...assets });
}

export const localMemories: MemoryRepository = {
  save: saveDay,
  load,
  async list() {
    return transact([days, media], 'readonly', async tx => {
      const stored: StoredDay[] = await resultOf(tx.objectStore(days).getAll());
      const summaries = await Promise.all(stored.map(async ({ manifest }) => {
        const { id, title, date } = manifest;
        const assets: StoredMedia | undefined = await resultOf(tx.objectStore(media).get(id));
        return { id, title, date, palette: manifest.photos?.[0]?.palette, thumbnail: assets?.thumbnail };
      }));
      return summaries.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    });
  },
  async delete(id) {
    await transact([days, media, checkpointsStore], 'readwrite', (tx) => Promise.all([
      resultOf(tx.objectStore(days).delete(id)), resultOf(tx.objectStore(media).delete(id)),
      resultOf(tx.objectStore(checkpointsStore).delete(dayCheckpointKey(id))),
    ]));
  },
  async exportDay(id) {
    const bundle = await load(id);
    if (!bundle) throw new Error('This memory was not found in this browser.');
    return exportBundle(bundle);
  },
  async importDay(zip) {
    const bundle = await importBundle(zip);
    await saveDay(bundle);
    return bundle.manifest.id;
  },
};
