import type { DayBundle, MemoryScene } from './memory-schema';

export interface MemoryViewerProps {
  manifest: MemoryScene;
  entryText: string;
  world?: DayBundle['world'];
  resolveAsset(id: string): Promise<Blob>;
  onComplete(): void;
}

export function createViewerProps({ manifest, entryText, photos, audio, world }: DayBundle, onComplete: () => void): MemoryViewerProps {
  const assets = new Map([...photos, audio].map(({ id, blob }) => [id, blob]));
  return {
    manifest,
    entryText,
    world,
    onComplete,
    async resolveAsset(id) {
      const asset = assets.get(id);
      if (!asset) throw new Error('This memory is missing an asset.');
      return asset;
    },
  };
}
