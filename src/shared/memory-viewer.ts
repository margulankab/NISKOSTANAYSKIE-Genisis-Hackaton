import { songLabel } from '../music/song';
import type { DayBundle, MemoryScene } from './memory-schema';

export interface MemoryViewerProps {
  manifest: MemoryScene;
  entryText: string;
  world?: DayBundle['world'];
  song?: DayBundle['song'];
  /** The song shown as "now playing": the linked song, or the uploaded file's name. */
  trackName?: string;
  resolveAsset(id: string): Promise<Blob>;
  onComplete(): void;
}

/** "coastal-light.wav" → "Coastal light". */
function prettyFilename(name: string) {
  const words = name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function createViewerProps({ manifest, entryText, photos, audio, world, song }: DayBundle, onComplete: () => void): MemoryViewerProps {
  const assets = new Map([...photos, audio].map(({ id, blob }) => [id, blob]));
  return {
    manifest,
    entryText,
    world,
    ...(song && { song }),
    trackName: song ? songLabel(song) : prettyFilename(audio.filename),
    onComplete,
    async resolveAsset(id) {
      const asset = assets.get(id);
      if (!asset) throw new Error('This memory is missing an asset.');
      return asset;
    },
  };
}
