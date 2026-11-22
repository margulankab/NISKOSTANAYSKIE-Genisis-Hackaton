import { placementHeight, recipes } from './recipes';
import { blocked } from '../gameplay/controller';
import type { RecipeId } from './recipes';
import { parsePrompt } from './parse-prompt';
import { routeProblems } from './route';
import {
  LAYOUT_VERSION, PARSER_VERSION, WORLD_SCHEMA_VERSION, promptSchema, promptWorldSchema, toWalkLayout,
} from './world-schema';
import type { Interpretation, Placement, PromptWorld, Term, WorldLayout } from './world-schema';
import { RECIPE_CATALOG_VERSION } from './recipes';

export type ComposeResult =
  | { ok: true; world: PromptWorld }
  | { ok: false; reason: string; interpretation: Interpretation | null };

type Rect = WorldLayout['bounds'];
type Solid = WorldLayout['solids'][number];

const OUTDOOR: Rect = { minX: -8, maxX: 8, minZ: -10, maxZ: 7 };
const INDOOR_ONLY: Rect = { minX: -6, maxX: 6, minZ: -7, maxZ: 5 };
const PLAYER_RADIUS = 0.3;
const REACH = 1.7;
const ATTEMPTS = 4;

const palette: Record<NonNullable<Term['color']>, [number, number, number]> = {
  red: [196, 64, 52], orange: [222, 132, 54], yellow: [232, 196, 82], green: [86, 150, 84], blue: [70, 118, 190],
  purple: [128, 86, 168], pink: [222, 142, 170], white: [236, 232, 222], black: [44, 44, 48], brown: [120, 84, 56], grey: [130, 132, 136],
};
export const termPaint = (term: Term) => term.color ? palette[term.color] : null;
const outdoorOnly = new Set<RecipeId>(['lighthouse', 'tower', 'house', 'stall', 'bridge', 'pier', 'hill', 'gate', 'boat', 'tree', 'lamp']);
/** Large or spread-out structures make poor discoveries: their center is not where the player stands. */
const notDiscoverable = new Set<RecipeId>(['hill', 'bridge', 'pier', 'gate', 'canopy']);
/** Rough top height of each recipe, used to raise objects described as above another. */
const heights: Partial<Record<RecipeId, number>> = { stall: 2, house: 2.6, bridge: 2.4, tree: 2.1, table: 0.8, tower: 3.4, lighthouse: 4 };

export function seedFromPrompt(prompt: string) {
  let hash = 0x811c9dc5;
  for (const char of prompt.trim().toLowerCase()) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value: number) => Math.round(value * 100) / 100;
const inside = (r: Rect, x: number, z: number, margin = 0) =>
  x >= r.minX + margin && x <= r.maxX - margin && z >= r.minZ + margin && z <= r.maxZ - margin;

/** The clause around a term, trimmed to at most ~16 words, as the discovery's excerpt. */
export function clauseAround(prompt: string, start: number, end: number) {
  let from = start, to = end;
  while (from > 0 && !/[.!?;,\n]/.test(prompt[from - 1]) && !/\s(?:and|then|while|with)\s$/i.test(prompt.slice(Math.max(0, from - 6), from))) from -= 1;
  while (to < prompt.length && !/[.!?;,\n]/.test(prompt[to]) && !/^\s(?:and|then|while|with)\s/i.test(prompt.slice(to, to + 7))) to += 1;
  while (from < to && /\s/.test(prompt[from])) from += 1;
  while (to > from && /\s/.test(prompt[to - 1])) to -= 1;
  const words = [...prompt.slice(from, to).matchAll(/\S+/g)];
  if (words.length > 16) {
    const index = Math.max(0, words.findIndex((w) => from + w.index + w[0].length > start) - 6);
    const last = Math.min(words.length - 1, index + 15);
    to = from + words[last].index + words[last][0].length;
    from += words[index].index;
  }
  return { start: from, end: to };
}

const titleStops = new Set('a an and as at by for from in into of on or the to with'.split(' '));
/**
 * A 3–7 word title from the first phrase of the prompt. It ends on a described object
 * ("Carousel Beside a Lighthouse") rather than a dangling word ("…Lighthouse Above").
 */
export function titleFromPrompt(prompt: string, fallback: string, termStarts: readonly number[] = []) {
  const end = prompt.search(/[.!?;,\n]/);
  const words = [...prompt.slice(0, end < 0 ? prompt.length : end).matchAll(/[\p{L}\p{N}]+/gu)];
  while (words.length && titleStops.has(words[0][0].toLowerCase())) words.shift();
  const picked = words.slice(0, 7);
  const lastTerm = picked.map((w) => termStarts.includes(w.index)).lastIndexOf(true);
  if (lastTerm >= 2) picked.splice(lastTerm + 1);
  while (picked.length && titleStops.has(picked[picked.length - 1][0].toLowerCase())) picked.pop();
  const title = picked.length >= 3 ? picked.map((w) => w[0]) : [fallback, 'Memory', 'World'];
  return title.map((w, i) => i > 0 && titleStops.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)).join(' ');
}

interface Draft {
  bounds: Rect;
  spawn: { x: number; z: number };
  water: Rect | null;
  waterSide: 1 | -1;
  shoreX: number;
  indoor: WorldLayout['indoor'];
  placements: Placement[];
  occupied: { x: number; z: number; r: number }[];
  counters: Map<RecipeId, number>;
}

export interface TemplatePlacement {
  waterfront?: boolean;
  wallWindow?: boolean;
  ending: number;
  discoveries: readonly [number, number];
  surfaces: readonly (Term['zone'] | 'deck' | 'pool' | 'sand' | 'floor' | 'rock')[];
  size: 'small' | 'medium' | 'large';
}

export function composeLayout(prompt: string, interpretation: Interpretation, seed: number, attempt: number,
  plan?: TemplatePlacement): WorldLayout | string {
  const rand = seededRandom(seed + attempt * 7919);
  const { terms, relations, setting } = interpretation;
  const usable = terms.map((t, index) => ({ ...t, index })).filter((t) => t.status !== 'unsupported');
  const hasWater = plan?.waterfront || plan?.surfaces.includes('water') || usable.some((t) => t.zone === 'water' || (t.recipe && recipes[t.recipe].aquatic));
  const base = setting === 'indoor' ? INDOOR_ONLY : OUTDOOR;
  const scale = plan?.size === 'small' ? .94 : plan?.size === 'large' ? 1.05 : 1;
  const bounds = { ...base, minX: base.minX * scale, maxX: base.maxX * scale, minZ: base.minZ * scale };
  const waterSide: 1 | -1 = rand() < 0.5 ? 1 : -1;
  const shoreX = waterSide * 3.6;
  const draft: Draft = {
    bounds,
    spawn: setting === 'indoor' ? { x: 0, z: 3.6 } : { x: 0, z: 5.6 },
    water: hasWater && setting !== 'indoor'
      ? (waterSide > 0 ? { minX: shoreX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ }
        : { minX: bounds.minX, maxX: shoreX, minZ: bounds.minZ, maxZ: bounds.maxZ })
      : null,
    waterSide,
    shoreX,
    indoor: null,
    placements: [],
    occupied: [],
    counters: new Map(),
  };
  if (setting === 'mixed') {
    const side = draft.water ? -waterSide : -1;
    const inner = side * 2.4;
    const area = side < 0 ? { minX: bounds.minX, maxX: inner, minZ: -6, maxZ: 1 } : { minX: inner, maxX: bounds.maxX, minZ: -6, maxZ: 1 };
    draft.indoor = { area, door: { x: inner, z: -2.5, width: 1.8 } };
  } else if (setting === 'indoor') {
    draft.indoor = { area: { ...bounds }, door: { x: 0, z: bounds.maxZ, width: 1.8 } };
  }
  draft.occupied.push({ ...draft.spawn, r: 1.4 });
  if (draft.indoor && setting === 'mixed') draft.occupied.push({ x: draft.indoor.door.x, z: draft.indoor.door.z, r: 1.2 });

  // Later attempts thin out decoration so the route can be found.
  const countFor = (t: Term) => attempt >= 3 ? 1 : attempt >= 2 ? Math.ceil(t.count / 2) : t.count;
  const zoneOf = (t: { span: { start: number }; recipe?: RecipeId | null }): 'indoor' | 'outdoor' => {
    if (setting !== 'mixed') return setting === 'indoor' ? 'indoor' : 'outdoor';
    if (plan && 'index' in t && typeof t.index === 'number') return plan.surfaces[t.index] === 'floor' ? 'indoor' : 'outdoor';
    if (t.recipe && outdoorOnly.has(t.recipe)) return 'outdoor';
    const before = terms.filter((z) => z.kind === 'zone' && z.span.start <= t.span.start).at(-1);
    return before?.zone === 'indoor' ? 'indoor' : 'outdoor';
  };
  const regionFor = (zone: 'indoor' | 'outdoor'): Rect => zone === 'indoor' && draft.indoor ? draft.indoor.area : bounds;

  function free(x: number, z: number, r: number, zone: 'indoor' | 'outdoor', aquatic = false) {
    if (!inside(bounds, x, z, 0.6)) return false;
    const inWater = draft.water ? inside(draft.water, x, z) : false;
    if (aquatic ? !inWater : inWater && !aquatic) return false;
    if (!aquatic && draft.water && Math.abs(x - shoreX) < r + 0.2) return false;
    const room = draft.indoor?.area;
    if (room && setting === 'mixed') {
      const inRoom = inside(room, x, z, -(r + 0.25));
      if (zone === 'indoor' ? !inside(room, x, z, r + 0.35) : inRoom) return false;
    }
    return draft.occupied.every((o) => Math.hypot(o.x - x, o.z - z) >= o.r + r + 0.45);
  }

  function add(recipe: RecipeId, x: number, z: number, term: number | null, extra: Partial<Placement> = {}) {
    const n = (draft.counters.get(recipe) ?? 0) + 1;
    draft.counters.set(recipe, n);
    const color = term !== null && terms[term].color ? palette[terms[term].color!] : null;
    const placement: Placement = {
      id: `${recipe}-${n}`, recipe, x: round(x), z: round(z), y: 0,
      rotation: recipe === 'pier' || recipe === 'bridge' ? 0 : round(recipes[recipe].role === 'structure' ? (rand() - 0.5) * 0.4 : (rand() - 0.5) * 2 * Math.PI * 0.9),
      scale: 1, color, term, ...extra,
    };
    draft.placements.push(placement);
    draft.occupied.push({ x: placement.x, z: placement.z, r: Math.max(recipes[recipe].radius, recipe === 'bridge' || recipe === 'pier' || recipe === 'canopy' ? 0 : 0.4) });
    return placement;
  }

  function scatter(recipe: RecipeId, zone: 'indoor' | 'outdoor', term: number | null, near?: { x: number; z: number }, back = false) {
    const region = regionFor(zone);
    const r = Math.max(recipes[recipe].radius, 0.35);
    const aquatic = Boolean(recipes[recipe].aquatic) && draft.water !== null && zone === 'outdoor';
    for (let tries = 0; tries < 60; tries += 1) {
      let x: number, z: number;
      if (near) {
        const angle = rand() * Math.PI * 2;
        const distance = 1.3 + rand() * 1.4;
        x = near.x + Math.cos(angle) * distance;
        z = near.z + Math.sin(angle) * distance;
      } else if (aquatic && draft.water) {
        x = shoreX + draft.waterSide * (0.8 + rand() * 1.2);
        z = region.minZ + 1 + rand() * (Math.min(region.maxZ, 3) - region.minZ - 1);
      } else {
        x = region.minX + 0.8 + rand() * (region.maxX - region.minX - 1.6);
        const maxZ = back ? Math.min(region.maxZ, 0) : Math.min(region.maxZ, draft.spawn.z - 1.2);
        z = region.minZ + 0.8 + rand() * (maxZ - region.minZ - 0.8);
      }
      if (free(x, z, r, zone, aquatic)) return add(recipe, x, z, term);
    }
    return undefined;
  }

  // 1 · Closing landmark: the highest-ranked structure, or a gate when the prompt names none.
  const landmarkTerm = plan ? usable.find(({ index }) => index === plan.ending) :
    [...usable].filter((t) => t.recipe && recipes[t.recipe].role === 'structure' && t.recipe !== 'pier' && t.recipe !== 'hill' && t.recipe !== 'canopy')
    .sort((a, b) => recipes[b.recipe!].landmarkRank - recipes[a.recipe!].landmarkRank || a.index - b.index)[0];
  const relationOf = (index: number) => relations.find((r) => r.status === 'applied' && r.subject === index);
  const placedFirst = new Map<number, Placement>();
  let landmark: Placement;
  const backZ = bounds.minZ + 2.4;
  if (landmarkTerm) {
    const relation = relationOf(landmarkTerm.index);
    const overWater = relation?.kind === 'above' && terms[relation.object!].zone === 'water' && draft.water;
    const indoor = plan && zoneOf(landmarkTerm) === 'indoor' && draft.indoor;
    const lx = indoor ? (indoor.area.minX + indoor.area.maxX) / 2 :
      overWater ? shoreX - draft.waterSide * 1.6 : landmarkTerm.recipe === 'bridge' ? 0 : (rand() - 0.5) * 3;
    const onWall = plan?.wallWindow && indoor && landmarkTerm.recipe === 'window';
    const lz = indoor ? indoor.area.minZ + (onWall ? .23 : 1.6) : landmarkTerm.recipe === 'bridge' ? -5 : backZ;
    let rise = 0;
    if (overWater || terms.some((t) => t.recipe === 'hill' && relations.some((r) => r.subject === landmarkTerm.index && r.object === terms.indexOf(t)))) {
      const hillTerm = terms.findIndex((t) => t.recipe === 'hill');
      const hill = add('hill', lx, lz, hillTerm >= 0 ? hillTerm : null, { scale: 1.25 });
      placedFirst.set(hillTerm, hill);
      rise = (placementHeight('hill') ?? 0) * hill.scale;
    }
    landmark = add(landmarkTerm.recipe!, lx, lz, landmarkTerm.index, { y: rise, ...(onWall && { rotation: 0 }) });
    placedFirst.set(landmarkTerm.index, landmark);
  } else {
    landmark = add('gate', 0, backZ, null);
  }

  // 2 · Supporting structures that other objects refer to, then everything else in prompt order.
  const referenced = new Set(relations.filter((r) => r.status === 'applied').map((r) => r.object));
  if (plan) for (const item of usable) if (item.recipe === 'pier' || item.recipe === 'stall') referenced.add(item.index);
  const order = usable.filter((t) => t.kind === 'object' && !placedFirst.has(t.index) && t.recipe !== 'hill')
    .sort((a, b) => Number(referenced.has(b.index)) - Number(referenced.has(a.index)) || a.index - b.index);
  if (usable.some((t) => t.recipe === 'hill') && !placedFirst.has(terms.findIndex((t) => t.recipe === 'hill'))) {
    const hill = usable.find((t) => t.recipe === 'hill')!;
    const placed = scatter('hill', zoneOf(hill), hill.index, undefined, true);
    if (placed) placedFirst.set(hill.index, placed);
  }

  for (const term of order) {
    const recipe = term.recipe!;
    const zone = zoneOf(term);
    const relation = relationOf(term.index);
    const target = relation && relation.object !== null ? placedFirst.get(relation.object) : undefined;
    const targetZone = relation && relation.object !== null ? terms[relation.object].zone : null;
    const count = countFor(term);
    let first: Placement | undefined;

    if (plan?.wallWindow && draft.indoor && setting === 'indoor' && recipe === 'window' &&
      !draft.placements.some(p => p.recipe === 'window')) {
      const { area } = draft.indoor;
      first = add(recipe, (area.minX + area.maxX) / 2, area.minZ + .23, term.index, { rotation: 0 });
    } else if (draft.indoor && setting === 'mixed' && (recipe === 'airlock' || recipe === 'doorway')) {
      first = add(recipe, draft.indoor.door.x, draft.indoor.door.z, term.index, { rotation: Math.PI / 2 });
    } else if (recipe === 'pier' && draft.water) {
      const z = -3 + rand() * 4;
      first = add('pier', shoreX + draft.waterSide * 1.32, z, term.index, { rotation: -draft.waterSide * Math.PI / 2 });
      draft.occupied.push({ x: shoreX - draft.waterSide * 0.6, z, r: 0.8 });
    } else if (recipe === 'boat' && plan && draft.water && !target && placedFirst.size) {
      const deck = [...placedFirst.values()].find(p => p.recipe === 'pier');
      if (deck) first = add('boat', deck.x + draft.waterSide * .27, deck.z + 1.45, term.index, { rotation: Math.PI / 2, scale: .8 });
    } else if (recipe === 'canopy' && plan && !target) {
      const stalls = draft.placements.filter(p => p.recipe === 'stall');
      for (const stall of stalls.slice(0, count)) {
        const canopy = add('canopy', stall.x, stall.z, term.index, { rotation: stall.rotation, scale: stall.scale });
        first ??= canopy;
      }
      if (first) { placedFirst.set(term.index, first); continue; }
    } else if (recipe === 'bridge') {
      first = add('bridge', 0, -4.5 + rand(), term.index);
    } else if (relation && target) {
      const r = Math.max(recipes[recipe].radius, 0.35);
      if (relation.kind === 'above' || (relation.kind === 'under' && target.recipe !== 'bridge')) {
        const raised = relation.kind === 'above' ? target.y + (placementHeight(target.recipe) ?? heights[target.recipe] ?? 1.2) * target.scale : 0;
        if (raised > 0) {
          // "lanterns above the stalls": one per stall, cycling when there are more lanterns.
          const hosts = draft.placements.filter((p) => p.recipe === target.recipe);
          for (let k = 0; k < count; k += 1) {
            const host = hosts[k % hosts.length];
            const offset = Math.floor(k / hosts.length) * 0.5;
            const placed = add(recipe, host.x + offset, host.z, term.index, { y: raised });
            first ??= placed;
          }
          placedFirst.set(term.index, first!);
          continue;
        }
      }
      if (!first && relation.kind === 'under' && target.recipe === 'bridge') {
        for (let k = 0; k < count && k < 6; k += 1) {
          const x = (k % 2 ? 1 : -1) * (2.1 + Math.floor(k / 2) * 1.9);
          const z = target.z + (rand() - 0.5) * 0.6;
          if (free(x, z, r, zone)) {
            const placed = add(recipe, x, z, term.index, { rotation: 0 });
            first ??= placed;
          }
        }
        if (first) { placedFirst.set(term.index, first); continue; }
      }
      if (!first && target.recipe === 'pier' && recipes[recipe].aquatic) {
        const z = target.z + (rand() < 0.5 ? 1.4 : -1.4);
        first = add(recipe, target.x + draft.waterSide * 0.3, z, term.index, { rotation: Math.PI / 2, scale: 0.8 });
      }
      if (!first) {
        const step = relation.kind === 'beyond' ? { x: 0, z: -3 } : relation.kind === 'front' ? { x: 0, z: 2.5 } : null;
        const candidates = step ? [
          ...(target.recipe === 'airlock' && draft.indoor ? [{ x: target.x + Math.sign(target.x) * -1.7, z: target.z - .95 }] : []),
          { x: target.x + (rand() - 0.5), z: target.z + step.z },
        ]
          : Array.from({ length: 8 }, (_, k) => {
            const angle = (k / 8 + rand() * 0.1) * Math.PI * 2;
            const distance = Math.max(recipes[target.recipe].radius, 0.4) + r + 0.7;
            return { x: target.x + Math.cos(angle) * distance, z: target.z + Math.sin(angle) * distance };
          });
        const aquatic = Boolean(recipes[recipe].aquatic) && draft.water !== null;
        const spot = candidates.find((c) => free(c.x, c.z, r, zone, aquatic && inside(draft.water!, c.x, c.z)) || free(c.x, c.z, r, zone, false));
        if (spot) first = add(recipe, spot.x, spot.z, term.index);
      }
    } else if (relation && targetZone === 'water' && draft.water) {
      first = recipes[recipe].aquatic ? scatter(recipe, zone, term.index)
        : add(recipe, shoreX - draft.waterSide * 1.2, -2 + rand() * 4, term.index);
    }
    first ??= scatter(recipe, zone, term.index, undefined, recipes[recipe].role === 'structure');
    if (!first) continue;
    placedFirst.set(term.index, first);
    for (let k = 1; k < count; k += 1) scatter(recipe, zone, term.index, first);
  }

  // Cover the named market stalls with the catalog's open-sided canopy.
  if (!plan && /\bcovered\s+(?:night\s+)?market\b/i.test(prompt)) {
    for (const stall of draft.placements.filter(({ recipe }) => recipe === 'stall')) {
      add('canopy', stall.x, stall.z, null, { rotation: stall.rotation, scale: stall.scale });
    }
  }

  // 3 · Two discoveries: prefer described props, especially colored or related ones.
  const score = (t: (typeof usable)[number]) => (recipes[t.recipe!].role === 'prop' ? 4 : 0) + (t.color ? 2 : 0)
    + (relations.some((r) => r.status === 'applied' && (r.subject === t.index || r.object === t.index)) ? 1 : 0) - t.index * 0.01;
  const chosen: WorldLayout['discoveries'][number][] = [];
  const spots: Placement[] = [];
  const apart = (p: Placement) => spots.every((q) => Math.hypot(p.x - q.x, p.z - q.z) >= 2.6)
    && Math.hypot(p.x - landmark.x, p.z - landmark.z) >= 1.8;
  const eligible = plan ? plan.discoveries.flatMap(index => usable.filter(t => t.index === index))
    : usable.filter((t) => t.recipe && !notDiscoverable.has(t.recipe) && placedFirst.has(t.index)).sort((a, b) => score(b) - score(a));
  for (const t of eligible) {
    if (!placedFirst.has(t.index)) continue;
    const placement = placedFirst.get(t.index)!;
    if (chosen.length === 2 || placement === landmark || (!plan && !apart(placement))) continue;
    spots.push(placement);
    chosen.push({ placementId: placement.id, excerpt: clauseAround(prompt, t.span.start, t.span.end) });
  }
  while (chosen.length < 2) {
    if (plan) return 'The chosen discovery could not be placed.';
    let marker: Placement | undefined;
    for (let tries = 0; tries < 6 && (!marker || !apart(marker)); tries += 1) {
      if (marker) { draft.placements.pop(); draft.occupied.pop(); draft.counters.set('marker', (draft.counters.get('marker') ?? 1) - 1); }
      marker = scatter('marker', setting === 'indoor' ? 'indoor' : 'outdoor', null);
    }
    if (marker) spots.push(marker);
    if (!marker) return 'There was no free space for a discovery.';
    // A memory stone quotes a clause that no other discovery uses yet.
    const clauses: { start: number; end: number }[] = [];
    for (let at = prompt.search(/[\p{L}\p{N}]/u); at >= 0 && at < prompt.length;) {
      const clause = clauseAround(prompt, at, at + 1);
      if (clause.end > clause.start) clauses.push(clause);
      const next = prompt.slice(Math.max(clause.end, at + 1)).search(/[\p{L}\p{N}]/u);
      at = next < 0 ? -1 : Math.max(clause.end, at + 1) + next;
    }
    const excerpt = clauses.find((c) => chosen.every(({ excerpt: e }) => c.end <= e.start || c.start >= e.end)) ?? clauses[0];
    chosen.push({ placementId: marker.id, excerpt });
  }

  // Room boundaries supplement the footprints and floor surfaces from the geometry catalog.
  const solids: Solid[] = [];
  if (draft.indoor && setting === 'mixed') {
    const { area, door } = draft.indoor;
    const t = 0.12;
    solids.push({ shape: 'box', x: round((area.minX + area.maxX) / 2), z: area.minZ, halfX: round((area.maxX - area.minX) / 2), halfZ: t });
    solids.push({ shape: 'box', x: round((area.minX + area.maxX) / 2), z: area.maxZ, halfX: round((area.maxX - area.minX) / 2), halfZ: t });
    const lower = door.z - door.width / 2, upper = door.z + door.width / 2;
    solids.push({ shape: 'box', x: door.x, z: round((area.minZ + lower) / 2), halfX: t, halfZ: round((lower - area.minZ) / 2) });
    solids.push({ shape: 'box', x: door.x, z: round((upper + area.maxZ) / 2), halfX: t, halfZ: round((area.maxZ - upper) / 2) });
  }

  const layout: WorldLayout = {
    geometryVersion: 2,
    bounds,
    spawn: draft.spawn,
    playerRadius: PLAYER_RADIUS,
    reach: REACH,
    water: draft.water,
    indoor: draft.indoor,
    placements: draft.placements,
    solids,
    discoveries: [chosen[0], chosen[1]],
    landmark: { placementId: landmark.id },
  };
  if (plan) {
    const walk = toWalkLayout(layout);
    const points = [walk.artifacts[0], walk.artifacts[1], walk.landmark] as NonNullable<WorldLayout['approaches']>;
    for (const [index, p] of [...spots, landmark].entries()) {
      if (p.recipe === 'boat' || p.y > 0) continue;
      const offset = Math.max(.7, recipes[p.recipe].radius + .46);
      const approach = [[0, offset], [offset, 0], [-offset, 0], [0, -offset]]
        .map(([x, z]) => ({ x: round(p.x + x), z: round(p.z + z) }))
        .find(point => inside(bounds, point.x, point.z, .3) && !blocked(point, walk));
      if (approach) points[index] = approach;
    }
    layout.approaches = points;
  }
  const problems = routeProblems(toWalkLayout(layout));
  return problems.length ? problems.join(' ') : layout;
}

/**
 * Compose a validated, walkable world from a free-form prompt. Same prompt, seed and versions give the same layout.
 * Coordinates come from trusted rules and the seed; prompt text only selects recipes and excerpts.
 */
export function composeWorld(prompt: string, { id, seed = seedFromPrompt(prompt) }: { id: string; seed?: number }): ComposeResult {
  const checked = promptSchema.safeParse(prompt);
  if (!checked.success) return { ok: false, reason: checked.error.issues[0].message, interpretation: null };
  const interpretation = parsePrompt(prompt);
  if (!interpretation.terms.some((t) => t.status !== 'unsupported')) {
    return { ok: false, reason: 'None of the described places or objects have a builder yet. Try naming a landmark such as a lighthouse, bridge, house or market.', interpretation };
  }
  let lastProblem = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const layout = composeLayout(prompt, interpretation, seed, attempt);
    if (typeof layout === 'string') { lastProblem = layout; continue; }
    const landmarkTerm = layout.placements.find((p) => p.id === layout.landmark.placementId)?.term;
    const fallback = landmarkTerm !== null && landmarkTerm !== undefined ? recipes[interpretation.terms[landmarkTerm].recipe!].label.split(' ')[0] : 'Prompt';
    const reportedTerms = interpretation.terms.map((term, index): Term => {
      if (term.kind !== 'object' || term.status === 'unsupported') return term;
      const placed = layout.placements.filter((object) => object.term === index).length;
      return placed === 0 ? { ...term, status: 'unsupported', note: 'No room in this layout.' }
        : placed < term.count ? { ...term, status: 'approximated', note: `placed ${placed} of ${term.count}` }
        : term;
    });
    const reportedRelations = interpretation.relations.map((relation) => {
      if (relation.status !== 'applied' || ![relation.subject, relation.object].some(
        (index) => index !== null && reportedTerms[index].status === 'unsupported',
      )) return relation;
      return { ...relation, status: 'unsupported' as const };
    });
    const world = promptWorldSchema.safeParse({
      kind: 'prompt-world',
      id,
      schemaVersion: WORLD_SCHEMA_VERSION,
      versions: { parser: PARSER_VERSION, layout: LAYOUT_VERSION, catalog: RECIPE_CATALOG_VERSION },
      seed,
      title: titleFromPrompt(prompt, fallback, interpretation.terms.map((t) => t.span.start)),
      prompt,
      interpretation: { ...interpretation, terms: reportedTerms, relations: reportedRelations },
      layout,
      soundtrack: null,
    });
    if (world.success) return { ok: true, world: world.data };
    lastProblem = world.error.issues[0].message;
  }
  return { ok: false, reason: 'A walkable layout could not be placed for this description (' + lastProblem + ') Try fewer objects or simpler relationships.', interpretation };
}
