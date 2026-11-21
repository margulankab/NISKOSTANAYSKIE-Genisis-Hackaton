import type { Point, Solid, WalkLayout } from './layout';

export const PLAYER_SPEED = 3.2;
export interface Input { x: number; z: number }

function clampBounds({ x, z }: Point, { bounds, playerRadius: r }: WalkLayout): Point {
  return {
    x: Math.min(bounds.maxX - r, Math.max(bounds.minX + r, x)),
    z: Math.min(bounds.maxZ - r, Math.max(bounds.minZ + r, z)),
  };
}

function overlaps(p: Point, r: number, s: Solid) {
  if (s.shape === 'circle') return Math.hypot(p.x - s.x, p.z - s.z) < s.radius + r;
  const dx = Math.max(Math.abs(p.x - s.x) - s.halfX, 0);
  const dz = Math.max(Math.abs(p.z - s.z) - s.halfZ, 0);
  return Math.hypot(dx, dz) < r;
}

export function blocked(p: Point, layout: WalkLayout) {
  return layout.solids.some((s) => overlaps(p, layout.playerRadius, s));
}

/** Move by input for dt seconds; axes resolve separately so the player slides along solids. */
export function stepPlayer(position: Point, input: Input, dt: number, layout: WalkLayout): Point {
  const length = Math.hypot(input.x, input.z);
  if (length === 0 || dt <= 0) return position;
  const step = PLAYER_SPEED * Math.min(dt, 0.1) / Math.max(length, 1);
  let next = position;
  const tryMove = (candidate: Point) => {
    const bounded = clampBounds(candidate, layout);
    if (!blocked(bounded, layout)) next = bounded;
  };
  tryMove({ x: next.x + input.x * step, z: next.z });
  tryMove({ x: next.x, z: next.z + input.z * step });
  return next;
}

export type Target =
  | { kind: 'artifact'; index: 0 | 1 }
  | { kind: 'ending'; ready: boolean };

const near = (a: Point, b: Point, reach: number) => Math.hypot(a.x - b.x, a.z - b.z) <= reach;

/** What E / the Interact button would act on right now, if anything. */
export function targetAt(position: Point, layout: WalkLayout, revealedCount: number): Target | null {
  let best: { index: 0 | 1; distance: number } | null = null;
  for (const index of [0, 1] as const) {
    const a = layout.artifacts[index];
    const distance = Math.hypot(position.x - a.x, position.z - a.z);
    if (distance <= layout.reach && (!best || distance < best.distance)) best = { index, distance };
  }
  if (best) return { kind: 'artifact', index: best.index };
  if (near(position, layout.landmark, layout.reach)) return { kind: 'ending', ready: revealedCount >= 2 };
  return null;
}
