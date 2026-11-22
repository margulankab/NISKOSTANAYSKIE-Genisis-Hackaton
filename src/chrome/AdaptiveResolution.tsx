import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

const TARGET_FPS = 30;
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;
const KEY = 'memory-worlds-render-scale';
/** Two short measurements after the world opens, then the resolution is fixed for the visit. */
const WINDOWS = [1400, 1400];

/** The scale this device settled on last time, so later visits start there instead of re-measuring from full size. */
function rememberedScale() {
  try {
    const saved = Number(localStorage.getItem(KEY));
    return saved >= MIN_SCALE && saved <= MAX_SCALE ? saved : null;
  } catch { return null; }
}
function rememberScale(value: number) {
  try { localStorage.setItem(KEY, String(value)); } catch { /* private mode: measure again next time */ }
}

/**
 * Render scale (device-pixel ratio) for a 3D stage. The stage owns it and passes it to <Canvas dpr>,
 * so re-renders keep the chosen value. With the pixel filter on, the scale is a fixed 0.5.
 */
export function useRenderScale(pixel: boolean) {
  const [scale, setScale] = useState(() => rememberedScale() ?? Math.min(window.devicePixelRatio || 1, MAX_SCALE));
  return { dpr: pixel ? 0.5 : scale, adapt: pixel ? null : setScale, scale };
}

/**
 * Keeps worlds walkable on slow devices: if the first seconds render below 30 frames per second,
 * render fewer pixels (down to half resolution) and let the browser scale them up. The choice is made
 * at most twice, early, and then locked so a world at rest stays pixel-identical.
 */
export function AdaptiveResolution({ scale, onScale }: { scale: number; onScale: (scale: number) => void }) {
  const measure = useRef({ round: 0, frames: 0, start: 0, warm: 0 });
  const current = useRef(scale);
  useFrame(() => {
    const m = measure.current;
    if (m.round >= WINDOWS.length) return;
    // Skip the first frames: shaders compile and textures upload then.
    if (m.warm < 12) { m.warm += 1; m.start = performance.now(); m.frames = 0; return; }
    m.frames += 1;
    const elapsed = performance.now() - m.start;
    if (elapsed < WINDOWS[m.round]) return;
    const fps = (m.frames * 1000) / elapsed;
    m.round += 1;
    m.warm = 0;
    // Pixel cost scales with the square of the scale.
    const next = fps >= TARGET_FPS * 0.9 ? current.current
      : Math.max(MIN_SCALE, Math.round(current.current * Math.sqrt(fps / TARGET_FPS) * 4) / 4);
    if (next < current.current) {
      current.current = next;
      onScale(next);
    } else m.round = WINDOWS.length;
    rememberScale(current.current);
  });
  return null;
}
