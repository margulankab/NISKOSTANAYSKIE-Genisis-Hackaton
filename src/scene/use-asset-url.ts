import { useEffect, useState } from 'react';
import type { MemoryViewerProps } from '../shared/memory-viewer';

type AssetUrl = { status: 'loading' } | { status: 'error' } | { status: 'ready'; url: string };
export type ResolveAsset = MemoryViewerProps['resolveAsset'];

export function useAssetUrl(id: string, resolveAsset: ResolveAsset): AssetUrl {
  const [result, setResult] = useState<AssetUrl>({ status: 'loading' });

  useEffect(() => {
    let disposed = false;
    let url: string | undefined;
    setResult({ status: 'loading' });

    async function open() {
      try {
        const blob = await resolveAsset(id);
        if (disposed) return;
        url = URL.createObjectURL(blob);
        setResult({ status: 'ready', url });
      } catch {
        if (!disposed) setResult({ status: 'error' });
      }
    }

    void open();
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, resolveAsset]);

  return result;
}
