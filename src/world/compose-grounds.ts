import { blocked } from '../gameplay/controller';
import type { Point } from '../gameplay/layout';
import { catalogById } from './catalog';
import { clauseAround, seededRandom, termPaint } from './compose-world';
import { toWalkLayout } from './layout-schema';
import type { Interpretation, Placement, WorldLayout } from './layout-schema';
import type { RecipeId } from './recipes';
import { routeTo } from './route';
import type { SceneTemplate } from './scene-template-schema';

type Rect = WorldLayout['bounds'];
const round = (value: number) => Math.round(value * 100) / 100;
const reflection = (x: number, mirrored: boolean) => mirrored ? -x : x;
const waterAttractions = new Set<RecipeId>(['tube-slide', 'open-flume', 'splash-pad', 'lazy-river']);
const trees = new Set<RecipeId>(['tree', 'pine', 'birch', 'willow', 'palm']);

export function signatureProblems(profile: WorldLayout['profile'], placements: readonly Pick<Placement, 'recipe'>[]) {
  const ids = placements.map(p => p.recipe);
  if (profile === 'park' && (!ids.includes('gazebo') || ids.filter(id => trees.has(id)).length < 5 ||
    new Set(ids.filter(id => trees.has(id))).size < 2 || ids.filter(id => id === 'bench').length < 2 ||
    !ids.some(id => id === 'flower-bed' || id === 'flower' || id === 'planter'))) {
    return ['A park needs a gazebo, two seats, flowers or planters, and five trees across two silhouettes.'];
  }
  if (profile === 'water-park' && (!ids.includes('pool-basin') || !ids.includes('entry-arch') ||
    ids.filter(id => waterAttractions.has(id)).length < 2 || !ids.some(id => id === 'cabana' || id === 'lifeguard-chair'))) {
    return ['A water park needs a pool, an entrance, two water attractions, and shade or a lifeguard chair.'];
  }
  return [];
}

/** Fit the landmark, recreation fixtures, and contextual anchors around a clear circulation lane. */
export function composeGrounds(prompt: string, template: SceneTemplate, interpretation: Interpretation, seed: number,
  attempt: number, ride = false): WorldLayout | string {
  const { groups, discoveries, ending, zones, spawn } = template;
  const profile = zones[spawn].family;
  const recreation = profile === 'water-park';
  const field = profile === 'ballfield';
  const sizes = { small: 7.9, medium: 8.6, large: 9.4 };
  const half = sizes[zones[spawn].size];
  const bounds: Rect = { minX: -half, maxX: half, minZ: field ? -16 : -10.4, maxZ: 7.7 };
  const rand = seededRandom(seed + attempt * 7919), mirror = rand() > .5;
  const poolHalfWidth = 2.25, poolHalfDepth = 1.75;
  const pool = { x: reflection(2.65 + rand() * .55, mirror), z: -.15 - rand() * .75 };
  const poolBounds = { minX: pool.x - poolHalfWidth, maxX: pool.x + poolHalfWidth, minZ: pool.z - poolHalfDepth, maxZ: pool.z + poolHalfDepth };
  const drySurfaces = recreation ? [
    { ...bounds, maxX: poolBounds.minX }, { ...bounds, minX: poolBounds.maxX },
    { ...bounds, minX: poolBounds.minX, maxX: poolBounds.maxX, maxZ: poolBounds.minZ },
    { ...bounds, minX: poolBounds.minX, maxX: poolBounds.maxX, minZ: poolBounds.maxZ },
  ] : undefined;
  const x = (value: number) => reflection(value, mirror);
  const spawnPoint = { x: x(-1.9), z: 6.1 };
  const occupied = [{ ...spawnPoint, radius: 1.1 }];
  const placements: Placement[] = [];
  const first = new Map<number, Placement>();
  const usedIds = new Map<RecipeId, number>();
  const lanes = [{ x: x(-1.9), minZ: -6.5, maxZ: 6.2 }];
  let attractionIndex = 0;
  const specialAttractions = [{ x: x(3.4), z: -6.2 }, { x: x(-5.1), z: -3.2 }, { x: x(6.3), z: -6.2 }];
  const fixed = new Map<RecipeId, Point>([
    ['pool-basin', pool], ['entry-arch', { x: spawnPoint.x, z: 4.65 }], ['park-gate', { x: spawnPoint.x, z: 4.65 }],
    ['pool-ladder', { x: round(poolBounds.minX + .35), z: round(poolBounds.maxZ + .13) }],
    ['life-ring', { x: recreation ? (mirror ? poolBounds.maxX + .44 : poolBounds.minX - .44) : x(-.4), z: pool.z + .48 }],
    ['lifeguard-chair', { x: ride ? pool.x + x(3.05) : pool.x, z: poolBounds.maxZ + .85 }],
    ['baseball-diamond', { x: 0, z: 0 }], ['dugout', { x: x(-6.8), z: 1.3 }],
    ['scoreboard', { x: x(7), z: -1 }],
  ]);
  if (ride && recreation) fixed.set('tube-slide', { x: pool.x, z: poolBounds.minZ - 1.92 });
  const isCloseToPool = (p: Point, radius: number) => recreation && p.x > poolBounds.minX - radius && p.x < poolBounds.maxX + radius &&
    p.z > poolBounds.minZ - radius && p.z < poolBounds.maxZ + radius;
  const free = (p: Point, radius: number) => p.x > bounds.minX + radius + .18 && p.x < bounds.maxX - radius - .18 &&
    p.z > bounds.minZ + radius + .18 && p.z < bounds.maxZ - radius - .18 && !isCloseToPool(p, radius + .06) &&
    (!field || Math.abs(p.x) >= radius + 6.5 || p.z > 2.6 + radius) &&
    !lanes.some(lane => Math.abs(lane.x - p.x) < radius + .72 && p.z > lane.minZ && p.z < lane.maxZ) &&
    occupied.every(other => Math.hypot(other.x - p.x, other.z - p.z) > other.radius + radius + .26);
  function place(index: number, at: Point, rotation = 0) {
    const { asset } = groups[index];
    const number = (usedIds.get(asset) ?? 0) + 1;
    usedIds.set(asset, number);
    const p: Placement = { id: `${asset}-${number}`, recipe: asset, x: round(at.x), z: round(at.z), y: 0,
      scale: 1, rotation, color: termPaint(interpretation.terms[index]), term: index };
    placements.push(p);
    if (asset !== 'pool-basin') occupied.push({ ...p, radius: Math.max(.25, catalogById[asset].radius) });
    if (!first.has(index)) first.set(index, p);
  }
  const relatedTo = new Set(interpretation.relations.filter(rel => rel.status === 'applied').map(rel => rel.object));
  const rank = (index: number) => index === ending ? 50 : discoveries.includes(index) ? 40
    : fixed.has(groups[index].asset) ? 38 : waterAttractions.has(groups[index].asset) ? 35
    : Number(relatedTo.has(index)) * 12 + Number(groups[index].feature !== null) * 8;
  const order = groups.map((_, index) => index).sort((a, b) => rank(b) - rank(a));
  for (const index of order) {
    const group = groups[index];
    if (group.asset === 'pool-basin' && !recreation) continue;
    for (let n = 0; n < group.count; n++) {
      const radius = Math.max(catalogById[group.asset].radius, .27);
      const relation = interpretation.relations.find(rel => rel.subject === index && rel.status === 'applied');
      const target = relation?.object === null || relation?.object === undefined ? undefined : first.get(relation.object);
      let spot = n === 0 ? fixed.get(group.asset) : undefined;
      if (!spot && index === ending && n === 0) spot = { x: x(-1.65 + rand() * .55), z: -7.45 };
      if (!spot && recreation && waterAttractions.has(group.asset)) spot = specialAttractions[attractionIndex++];
      if (!spot && discoveries.includes(index) && n === 0 && !target) {
        const anchor = discoveries.indexOf(index);
        const preferred = { x: x(anchor === 0 ? -3.45 : -.1), z: anchor === 0 ? 2.85 : -2 };
        if (free(preferred, radius)) spot = preferred;
      }
      if (!spot && target && relation) {
        const gap = 1.2 + radius + catalogById[target.recipe].radius;
        const offsets = relation.kind === 'beyond' ? [[0, -gap], [gap * .3, -gap]]
          : relation.kind === 'front' ? [[0, gap], [-gap * .3, gap]]
          : relation.kind === 'beside' ? [[gap, 0], [-gap, 0], [0, gap], [0, -gap]] : [];
        spot = offsets.map(([dx, dz]) => ({ x: target.x + dx, z: target.z + dz })).find(candidate => free(candidate, radius));
      }
      for (let retry = 0; !spot && retry < 120; retry++) {
        const side = rand() > .5 ? 1 : -1;
        const edge = trees.has(group.asset);
        const z = edge ? -9.5 + rand() * 15 : -7.8 + rand() * 12;
        const candidate = { x: edge ? side * (4.8 + rand() * (half - 5.4)) : (rand() - .5) * (half * 2 - 1.4), z };
        if (free(candidate, radius)) spot = candidate;
      }
      if (spot) place(index, spot, group.asset === 'tube-slide' || group.asset === 'open-flume'
        ? (ride && group.asset === 'tube-slide' && n === 0 ? 0 : x(.12)) : trees.has(group.asset) ? (rand() - .5) * 5 : 0);
    }
  }
  const missing = signatureProblems(profile, placements);
  if (missing.length) return missing[0];
  const targets = [...discoveries, ending].map(index => first.get(index));
  if (!targets[0] || !targets[1] || !targets[2]) return 'The discoveries and ending need clear deck or path approaches.';
  const [a, b, landmark] = targets as [Placement, Placement, Placement];
  const layout: WorldLayout = {
    geometryVersion: 3, profile, drySurfaces, water: null, indoor: null, bounds, spawn: spawnPoint, playerRadius: .3, reach: 1.7,
    placements, solids: [], discoveries: [a, b].map(p => {
      const { start, end } = interpretation.terms[p.term!].span;
      return { placementId: p.id, excerpt: clauseAround(prompt, start, end) };
    }) as WorldLayout['discoveries'], landmark: { placementId: landmark.id },
  };
  const walk = toWalkLayout(layout);
  const isDry = (p: Point) => !blocked(p, walk);
  const safeApproach = (p: Placement) => {
    const radius = Math.max(.62, catalogById[p.recipe].radius + .42);
    return [[0, radius], [-radius, 0], [radius, 0], [0, -radius]]
      .map(([dx, dz]) => ({ x: round(p.x + dx), z: round(p.z + dz) })).find(isDry);
  };
  const approaches = [a, b, landmark].map(safeApproach);
  if (approaches.some(approach => !approach)) return 'A required approach is blocked.';
  layout.approaches = approaches as [Point, Point, Point];
  return layout;
}

export function addRouteDressing(layout: WorldLayout): WorldLayout | string {
  const walk = toWalkLayout(layout);
  const first = routeTo(walk, { kind: 'artifact', index: 0 });
  const second = first && routeTo(walk, { kind: 'artifact', index: 1 }, first.at(-1));
  const ending = second && routeTo(walk, { kind: 'ending', ready: true }, second.at(-1));
  if (!first || !second || !ending) return 'The discoveries and ending must share a supported route.';
  return { ...layout, paths: [first, second, ending].filter(path => path.length > 1).map(path => path.slice(0, 80)) };
}
