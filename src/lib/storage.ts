import type { SavedWorld } from './types';
const KEY = 'memory-worlds:v1';

export type LoadResult = { ok: true; worlds: SavedWorld[] } | { ok: false; error: string; worlds: SavedWorld[] };

export function loadWorlds(): LoadResult {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ok: true, worlds: [] };
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('bad shape');
    return { ok: true, worlds: data.filter((w) => w?.config?.schemaVersion === 1) };
  } catch {
    return { ok: false, error: 'Your saved worlds could not be read. They may be corrupted or storage is blocked.', worlds: [] };
  }
}
export function saveWorld(w: SavedWorld): { ok: true } | { ok: false; error: string } {
  try {
    const cur = loadWorlds().worlds.filter((x) => x.id !== w.id);
    localStorage.setItem(KEY, JSON.stringify([w, ...cur]));
    return { ok: true };
  } catch {
    return { ok: false, error: 'This world could not be saved: browser storage is full or blocked. Try removing a photo or deleting an old world.' };
  }
}
export function deleteWorld(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify(loadWorlds().worlds.filter((w) => w.id !== id))); } catch { /* ignore */ }
}

/** Downscale an image/video still to keep localStorage small. */
export async function toThumb(file: File, max = 640): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    let src: CanvasImageSource, w: number, h: number;
    if (file.type.startsWith('video/')) {
      const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = url;
      await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('video')); });
      v.currentTime = Math.min(0.5, v.duration / 2 || 0);
      await new Promise<void>((res) => { v.onseeked = () => res(); setTimeout(res, 1500); });
      src = v; w = v.videoWidth; h = v.videoHeight;
    } else {
      const img = new Image(); img.src = url; await img.decode(); src = img; w = img.naturalWidth; h = img.naturalHeight;
    }
    if (!w || !h) return null;
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}
