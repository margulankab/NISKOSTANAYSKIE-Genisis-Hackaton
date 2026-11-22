import type { Point, Solid, WalkLayout } from './layout';

export const PLAYER_SPEED = 3.2;
/** Holding Shift covers the larger outdoor worlds faster. */
export const RUN_MULTIPLIER = 1.75;
export interface Input { x: number; z: number; run?: boolean }

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

const supportSamples = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-0.707, -0.707],
  [0.707, -0.707], [-0.707, 0.707], [0.707, 0.707]];

export function blocked(p: Point, layout: WalkLayout) {
  const { solids, playerRadius, walkable } = layout;
  return solids.some((s) => overlaps(p, playerRadius, s))
    || (walkable !== undefined && supportSamples.some(([dx, dz]) => {
      const x = p.x + dx * playerRadius;
      const z = p.z + dz * playerRadius;
      return !walkable.some(({ minX, maxX, minZ, maxZ }) => x >= minX && x <= maxX && z >= minZ && z <= maxZ);
    }));
}

/** Move by input for dt seconds; axes resolve separately so the player slides along solids. */
export function stepPlayer(position: Point, input: Input, dt: number, layout: WalkLayout): Point {
  const length = Math.hypot(input.x, input.z);
  if (length === 0 || dt <= 0) return position;
  const step = PLAYER_SPEED * (input.run ? RUN_MULTIPLIER : 1) * Math.min(dt, 0.1) / Math.max(length, 1);
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

function visible(from: Point, to: Point, layout: WalkLayout) {
  if (!layout.checkSight) return true;
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .11);
  for (let i = 1; i < steps; i++) {
    const p = { x: from.x + (to.x - from.x) * i / steps, z: from.z + (to.z - from.z) * i / steps };
    if (layout.solids.some(solid => overlaps(p, .035, solid) && !overlaps(to, .06, solid))) return false;
  }
  return true;
}

export function canReach(from: Point, to: Point, layout: WalkLayout) {
  return near(from, to, layout.reach) && visible(from, to, layout);
}

/** What E / the Interact button would act on right now, if anything. */
export function targetAt(position: Point, layout: WalkLayout, revealedCount: number, revealed: readonly boolean[] = []): Target | null {
  let best: { index: 0 | 1; distance: number; found: boolean } | null = null;
  for (const index of [0, 1] as const) {
    const a = layout.artifacts[index];
    const distance = Math.hypot(position.x - a.x, position.z - a.z);
    const found = Boolean(revealed[index]);
    if (distance <= layout.reach && (!best || Number(found) < Number(best.found) || found === best.found && distance < best.distance)
      && visible(position, a, layout)) best = { index, distance, found };
  }
  if (best && !best.found) return { kind: 'artifact', index: best.index };
  if (canReach(position, layout.landmark, layout) &&
      (revealedCount >= 2 || !best)) return { kind: 'ending', ready: revealedCount >= 2 };
  if (best) return { kind: 'artifact', index: best.index };
  return null;
}
