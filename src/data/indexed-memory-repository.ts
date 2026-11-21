import { dayBundleSchema } from '../shared/memory-schema';
import type { DayBundle } from '../shared/memory-schema';
import { exportBundle, importBundle } from './day-zip';
import type { MemoryRepository } from './repository';

const databaseName = 'memory-worlds';
const days = 'days';
const media = 'media';
type StoredDay = Pick<DayBundle, 'manifest' | 'entryText' | 'rights'> & { fingerprint: string };
type StoredMedia = Pick<DayBundle, 'photos' | 'audio' | 'thumbnail'>;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      reject(new Error('The archive is busy in another tab. Close that tab and retry.'));
    };
    request.onupgradeneeded = () => {
      request.result.createObjectStore(days);
      request.result.createObjectStore(media);
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

function resultOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(stores: string[], mode: IDBTransactionMode, operation: (tx: IDBTransaction) => Promise<T>) {
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

async function fingerprint({ manifest, entryText, rights, photos, audio, thumbnail }: DayBundle) {
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
  return digest(new Blob([JSON.stringify({ manifest, entryText, rights, assets, preview })]));
}

async function save(bundle: DayBundle) {
  const validated = dayBundleSchema.parse(bundle);
  const { manifest, entryText, rights, photos, audio, thumbnail } = validated;
  const day: StoredDay = { manifest, entryText, rights, fingerprint: await fingerprint(validated) };
  const assets: StoredMedia = { photos, audio, thumbnail };
  await transact([days, media], 'readwrite', async (tx) => {
    const table = tx.objectStore(days);
    const existing: StoredDay | undefined = await resultOf(table.get(manifest.id));
    if (existing) {
      if (existing.fingerprint !== day.fingerprint) throw new Error('A different memory already uses this ID.');
      return;
    }
    await Promise.all([resultOf(table.add(day, manifest.id)), resultOf(tx.objectStore(media).add(assets, manifest.id))]);
  });
}

async function load(id: string): Promise<DayBundle | undefined> {
  const [day, assets]: [StoredDay | undefined, StoredMedia | undefined] = await transact([days, media], 'readonly', (tx) =>
    Promise.all([resultOf(tx.objectStore(days).get(id)), resultOf(tx.objectStore(media).get(id))]));
  if (!day && !assets) return undefined;
  if (!day || !assets) throw new Error('This stored memory is missing its day or media records.');
  const { manifest, entryText, rights } = day;
  return dayBundleSchema.parse({ manifest, entryText, rights, ...assets });
}

export const localMemories: MemoryRepository = {
  save,
  load,
  async list() {
    const stored: StoredDay[] = await transact([days], 'readonly', (tx) => resultOf(tx.objectStore(days).getAll()));
    return stored.map(({ manifest: { id, title, date } }) => ({ id, title, date }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  },
  async delete(id) {
    await transact([days, media], 'readwrite', (tx) => Promise.all([
      resultOf(tx.objectStore(days).delete(id)), resultOf(tx.objectStore(media).delete(id)),
    ]));
  },
  async exportDay(id) {
    const bundle = await load(id);
    if (!bundle) throw new Error('This memory was not found in this browser.');
    return exportBundle(bundle);
  },
  async importDay(zip) {
    const bundle = await importBundle(zip);
    await save(bundle);
    return bundle.manifest.id;
  },
};
