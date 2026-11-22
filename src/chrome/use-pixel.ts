import { useSyncExternalStore } from 'react';
import { readSettings, subscribeToSettings } from '../menus/settings';

const pixelOf = () => readSettings().pixel;
/** Device-pixel ratio for 3D canvases: half resolution, scaled up crisply, when the pixel filter is on. */
export function useStageDpr(): [number, number] {
  return useSyncExternalStore(subscribeToSettings, pixelOf) ? [0.5, 0.5] : [1, 1.5];
}

/** Whether the pixel filter is on. */
export function usePixel() {
  return useSyncExternalStore(subscribeToSettings, pixelOf);
}
