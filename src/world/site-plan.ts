import { z } from 'zod';
import type { Point } from '../gameplay/layout';
import { groundBounds, toWalkLayout } from './layout-schema';
import type { Placement, WorldLayout } from './layout-schema';
import { placementSolids } from './recipes';
import { routeTo } from './route';
import type { SceneTemplate } from './scene-template-schema';

/**
 * Where things stand, as a planner draws it: each feature's copies on a top-down map of the scene.
 * x runs from -1 (left, as you arrive) to 1 (right); z from -1 (the far side) to 1 (where the visitor arrives).
 */
const unit = z.number().min(-1).max(1);
export const sitePlanSchema = z.strictObject({
  version: z.literal(1),
  groups: z.array(z.strictObject({
    feature: z.int().min(0).max(23),
    spots: z.array(z.strictObject({ x: unit, z: unit })).min(1).max(8),
  })).max(24),
});
export type SitePlan = z.infer<typeof sitePlanSchema>;

// Structural or water-bound pieces keep the composer's position; so do the anchors the visit is built around.
const fixed = new Set(['hill', 'pier', 'boat', 'bridge', 'tube-slide', 'open-flume', 'pool-basin', 'lazy-river', 'water-jet', 'splash-pad']);

function radiusOf(p: Placement) {
  const solids = placementSolids(p);
  if (!solids.length) return .3;
  return Math.max(...solids.map(s => Math.hypot(s.x - p.x, s.z - p.z) + (s.shape === 'circle' ? s.radius : Math.hypot(s.halfX, s.halfZ))));
}

function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Both discoveries and the landmark (which are also the plot's moment spots) can still be reached from the spawn. */
export function stillPlayable(layout: WorldLayout) {
  const walk = toWalkLayout(layout);
  return Boolean(routeTo(walk, { kind: 'artifact', index: 0 }) && routeTo(walk, { kind: 'artifact', index: 1 })
    && routeTo(walk, { kind: 'ending', ready: true }));
}

/**
 * Move the scenery toward the planner's site plan wherever the spot is free, dry, off the walkways and
 * clear of the anchors, then make sure the visit is still walkable; any move that blocks it is undone.
 */
export function applySitePlan(layout: WorldLayout, template: SceneTemplate, site: SitePlan): { layout: WorldLayout; moved: number; refused: string[] } {
  const anchors = new Set([...layout.discoveries.map(d => d.placementId), layout.landmark.placementId]);
  const keyPoints: Point[] = [layout.spawn, ...(layout.approaches ?? []),
    ...layout.placements.filter(p => anchors.has(p.id)).map(p => ({ x: p.x, z: p.z }))];
  // The map covers the composed scene (applied before open land is added around it): z = 1 at the spawn, z = -1 at the far edge.
  const land = layout.indoor?.area ?? groundBounds(layout);
  const nearIsMaxZ = layout.spawn.z >= (land.minZ + land.maxZ) / 2;
  const nearZ = layout.spawn.z;
  const farZ = nearIsMaxZ ? land.minZ + .8 : land.maxZ - .8;
  const minX = land.minX + .8, maxX = land.maxX - .8;
  const toWorld = ({ x, z }: { x: number; z: number }) => ({
    x: Math.round((minX + (x + 1) / 2 * (maxX - minX)) * 100) / 100,
    z: Math.round((farZ + (z + 1) / 2 * (nearZ - farZ)) * 100) / 100,
  });
  // Scenery the composer added on its own (no planned feature) gives way to the planner's drawing.
  const filler = (p: Placement) => !anchors.has(p.id) && p.y === 0 && (p.term === null || template.groups[p.term]?.feature == null);

  const wanted = new Map<number, Point>();
  for (const { feature, spots } of site.groups) {
    const groups = new Set(template.groups.flatMap((group, index) => group.feature === feature ? [index] : []));
    const movable = layout.placements.flatMap((p, index) => p.term !== null && groups.has(p.term) && !anchors.has(p.id)
      && p.y === 0 && !fixed.has(p.recipe) ? [index] : []);
    movable.slice(0, spots.length).forEach((index, spot) => wanted.set(index, toWorld(spots[spot])));
  }
  const placements = layout.placements.map(p => ({ ...p }));
  const removed = new Set<number>(), rejected = new Set<number>();
  const refused: string[] = [];
  const moves: { index: number; from: Placement }[] = [];
  const at = (j: number) => !rejected.has(j) && wanted.get(j) || placements[j];
  const overlaps = (a: Placement, b: Placement) => Math.hypot(a.x - b.x, a.z - b.z) <= radiusOf(a) + radiusOf(b) + .15;
  for (const [index, target] of wanted) {
    const candidate = { ...placements[index], ...target };
    const r = radiusOf(candidate);
    const inWater = layout.water && candidate.x > layout.water.minX - r && candidate.x < layout.water.maxX + r
      && candidate.z > layout.water.minZ - r && candidate.z < layout.water.maxZ + r;
    const problem = inWater ? 'water'
      : !(candidate.x - r > land.minX && candidate.x + r < land.maxX && candidate.z - r > land.minZ && candidate.z + r < land.maxZ) ? 'outside'
      : Math.hypot(layout.spawn.x - candidate.x, layout.spawn.z - candidate.z) < r + 1.5 ? 'spawn'
      : !keyPoints.every(k => Math.hypot(k.x - candidate.x, k.z - candidate.z) > r + .9) ? 'anchor'
      : !(layout.paths ?? []).every(path => path.every((point, i) => i === 0 || segmentDistance(candidate, path[i - 1], point) > r + .55)) ? 'walkway'
      : null;
    const open = !problem;
    const conflicts = open ? placements.flatMap((other, j) => j === index || removed.has(j) || other.y > 0
      || !overlaps(candidate, { ...other, ...at(j) }) ? [] : [j]) : [];
    const blocker = conflicts.find(j => !filler(placements[j]) || wanted.has(j) && !rejected.has(j));
    if (!open || blocker !== undefined) {
      refused.push(`${candidate.id}: ${problem ?? 'next to ' + placements[blocker!].id}`);
      rejected.add(index);
      continue;
    }
    conflicts.forEach(j => removed.add(j));
    moves.push({ index, from: placements[index] });
    placements[index] = candidate;
  }
  // A copy that could not move stays where it was: undo any move that would now stand on it.
  for (const stay of rejected) {
    for (let m = moves.length - 1; m >= 0; m--) {
      if (!overlaps(placements[moves[m].index], placements[stay])) continue;
      placements[moves[m].index] = moves[m].from;
      moves.splice(m, 1);
    }
  }
  const build = () => ({ ...layout, placements: placements.filter((_, j) => !removed.has(j)) });
  let result: WorldLayout = build();
  // Undo the most recent moves until the visit can be walked again.
  while (moves.length && !stillPlayable(result)) {
    const { index, from } = moves.pop()!;
    placements[index] = from;
    result = build();
  }
  return { layout: result, moved: moves.length, refused };
}
