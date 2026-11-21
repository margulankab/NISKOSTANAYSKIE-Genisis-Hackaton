import { describe, expect, it } from 'vitest';
import { blocked, stepPlayer, targetAt } from '../src/gameplay/controller';
import type { Target } from '../src/gameplay/controller';
import type { Point, WalkLayout } from '../src/gameplay/layout';
import { createCheckpoint, restoreCheckpoint } from '../src/world/checkpoint';
import { composeWorld } from '../src/world/compose-world';
import { parsePrompt } from '../src/world/parse-prompt';
import { routeTo } from '../src/world/route';
import { promptWorldSchema, toWalkLayout } from '../src/world/world-schema';
import type { PromptWorld } from '../src/world/world-schema';

const id = '6f1b3c1e-8d4f-4a52-9a5e-2b7c9d0e1f23';
const lighthouse = 'A lighthouse above a foggy cove with a red rowboat beside a pier.';
const market = 'A covered night market under a railway bridge, with lanterns above the stalls and a blue bench beside a lamp.';
const mixed = 'A quiet kitchen with a wooden table, then a garden with two oak trees and a carousel beyond the house.';

function build(prompt: string, seed?: number): PromptWorld {
  const result = composeWorld(prompt, { id, seed });
  if (!result.ok) throw new Error(result.reason);
  return result.world;
}
const recipesOf = (world: PromptWorld) => world.layout.placements.map(({ recipe }) => recipe).sort();
const placement = (world: PromptWorld, recipe: string) => world.layout.placements.find((p) => p.recipe === recipe)!;

/** Drive A's controller along the route, as a player holding arrow keys would. */
function walk(layout: WalkLayout, goal: Target): Point {
  const route = routeTo(layout, goal);
  if (!route) throw new Error('No route to ' + JSON.stringify(goal));
  let p = layout.spawn;
  for (const waypoint of route) {
    for (let i = 0; i < 2000 && Math.hypot(waypoint.x - p.x, waypoint.z - p.z) > 0.02; i += 1) {
      const dx = waypoint.x - p.x, dz = waypoint.z - p.z;
      const step = Math.min(1, Math.hypot(dx, dz) / (3.2 / 60));
      p = stepPlayer(p, { x: (dx / Math.hypot(dx, dz)) * step, z: (dz / Math.hypot(dx, dz)) * step }, 1 / 60, layout);
    }
  }
  return p;
}

function playThrough(world: PromptWorld) {
  const layout = toWalkLayout(world.layout);
  expect(blocked(layout.spawn, layout)).toBe(false);
  for (const goal of [{ kind: 'artifact', index: 0 }, { kind: 'artifact', index: 1 }, { kind: 'ending', ready: true }] as Target[]) {
    expect(targetAt(walk(layout, goal), layout, 2)).toEqual(goal);
  }
}

describe('AT-23 prompt worlds', () => {
  it('builds the lighthouse, hill, shore, pier and red boat, and the boat sits beside the pier', () => {
    const world = build(lighthouse);
    expect(recipesOf(world)).toEqual(expect.arrayContaining(['boat', 'hill', 'lighthouse', 'pier']));
    expect(world.layout.water).not.toBeNull();
    expect(world.interpretation.weather).toBe('fog');
    const boat = placement(world, 'boat'), pier = placement(world, 'pier');
    expect(boat.color).toEqual([196, 64, 52]);
    expect(Math.hypot(boat.x - pier.x, boat.z - pier.z)).toBeLessThan(2);
    expect(world.layout.landmark.placementId).toBe(placement(world, 'lighthouse').id);
    const hill = placement(world, 'hill'), tower = placement(world, 'lighthouse');
    expect([hill.x, hill.z]).toEqual([tower.x, tower.z]);
    playThrough(world);
  });

  it('builds a night market under a bridge that differs in objects, layout and route', () => {
    const night = build(market), coast = build(lighthouse);
    expect(night.interpretation.timeOfDay).toBe('night');
    expect(recipesOf(night)).toEqual(expect.arrayContaining(['bridge', 'stall', 'lantern', 'bench', 'lamp']));
    const bridge = placement(night, 'bridge');
    const stalls = night.layout.placements.filter((p) => p.recipe === 'stall');
    expect(stalls).toHaveLength(4);
    for (const stall of stalls) expect(Math.abs(stall.z - bridge.z)).toBeLessThan(0.5);
    expect(night.layout.placements.filter((p) => p.recipe === 'lantern').every((p) => p.y > 0)).toBe(true);
    expect(recipesOf(night)).not.toEqual(recipesOf(coast));
    expect(night.layout.water).toBeNull();
    expect(routeTo(toWalkLayout(night.layout), { kind: 'ending', ready: true }))
      .not.toEqual(routeTo(toWalkLayout(coast.layout), { kind: 'ending', ready: true }));
    playThrough(night);
  });

  it('mixes an indoor room with an outdoor garden and keeps objects in their own area', () => {
    const world = build(mixed);
    expect(world.interpretation.setting).toBe('mixed');
    const room = world.layout.indoor!.area;
    const inRoom = ({ x, z }: Point) => x > room.minX && x < room.maxX && z > room.minZ && z < room.maxZ;
    expect(inRoom(placement(world, 'table'))).toBe(true);
    const trees = world.layout.placements.filter((p) => p.recipe === 'tree');
    expect(trees).toHaveLength(2);
    expect(trees.some(inRoom)).toBe(false);
    playThrough(world);
  });

  it('reproduces the same layout for the same prompt, seed and versions', () => {
    const first = build(lighthouse);
    const again = composeWorld(lighthouse, { id: '0d6c9a4e-1f2b-4c3d-8e5f-6a7b8c9d0e1f' });
    expect(again.ok && again.world.layout).toEqual(first.layout);
    expect(build(lighthouse, 7).layout).toEqual(build(lighthouse, 7).layout);
  });

  it('changes the relevant output when an object or relationship is edited', () => {
    const base = build(lighthouse);
    expect(placement(build(lighthouse.replace('red', 'blue')), 'boat').color).toEqual([70, 118, 190]);
    const loose = build('A lighthouse above a foggy cove with a red rowboat, and a pier.');
    expect(loose.interpretation.relations.filter((r) => r.status === 'applied')).toHaveLength(1);
    expect(placement(loose, 'boat')).not.toEqual(placement(base, 'boat'));
    const benches = build(lighthouse + ' Two benches face the water.');
    expect(benches.layout.placements.filter((p) => p.recipe === 'bench')).toHaveLength(2);
  });

  it('identifies unsupported and approximated details', () => {
    const world = build(mixed);
    const carousel = world.interpretation.terms.find((t) => t.text === 'carousel')!;
    expect(carousel.status).toBe('unsupported');
    expect(world.interpretation.relations.find((r) => r.kind === 'beyond')!.status).toBe('unsupported');
    const castle = parsePrompt('An old castle on a hill with twelve trees.');
    expect(castle.terms.find((t) => t.text === 'castle')).toMatchObject({ status: 'approximated', recipe: 'tower' });
    expect(castle.terms.find((t) => t.text === 'trees')).toMatchObject({ status: 'approximated', count: 8 });
  });

  it('fails with a reason and keeps the interpretation when nothing can be built', () => {
    const result = composeWorld('Just a feeling of warmth and a carousel.', { id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/builder/);
      expect(result.interpretation?.terms.map((t) => t.status)).toContain('unsupported');
    }
    expect(composeWorld('short', { id }).ok).toBe(false);
  });

  it('quotes the prompt in discovery excerpts and rejects worlds whose route is blocked', () => {
    const world = build(market);
    for (const { excerpt } of world.layout.discoveries) {
      expect(world.prompt.slice(excerpt.start, excerpt.end).trim().length).toBeGreaterThan(3);
    }
    const target = world.layout.placements.find((p) => p.id === world.layout.discoveries[0].placementId)!;
    const walled = structuredClone(world);
    walled.layout.solids.push({ shape: 'circle', x: target.x, z: target.z, radius: 2.2 });
    expect(promptWorldSchema.safeParse(walled).success).toBe(false);
    expect(promptWorldSchema.safeParse({ ...world, prompt: world.prompt.slice(0, 20) }).success).toBe(false);
  });
});

describe('AT-25 checkpoints', () => {
  const world = build(lighthouse);
  const first = world.layout.discoveries[0].placementId;
  const state = { position: { x: 0.5, z: 3 }, revealed: new Set([first]), ended: false };

  it('round-trips position, discoveries and ending state', () => {
    const restored = restoreCheckpoint(world, createCheckpoint(world, state));
    expect(restored).toEqual({ ok: true, state: { position: { x: 0.5, z: 3 }, revealed: new Set([first]), ended: false } });
  });

  it('rejects stale, foreign, blocked and inconsistent checkpoints', () => {
    const checkpoint = createCheckpoint(world, state);
    const solid = world.layout.solids.find((s) => s.shape === 'circle')!;
    const cases = [
      { ...checkpoint, layoutKey: checkpoint.layoutKey.replace(/:\d+$/, ':1') },
      { ...checkpoint, worldId: '0d6c9a4e-1f2b-4c3d-8e5f-6a7b8c9d0e1f' },
      { ...checkpoint, position: { x: solid.x, z: solid.z } },
      { ...checkpoint, position: { x: 40, z: 0 } },
      { ...checkpoint, revealed: ['tree-9'] },
      { ...checkpoint, ended: true },
      { ...checkpoint, savedAt: 'yesterday' },
    ];
    for (const stored of cases) expect(restoreCheckpoint(world, stored).ok).toBe(false);
  });
});
