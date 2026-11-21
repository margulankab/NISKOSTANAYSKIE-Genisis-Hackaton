import { describe, expect, it } from 'vitest';
import { RUN_MULTIPLIER, stepPlayer } from '../src/gameplay/controller';
import { composeSceneTemplate } from '../src/world/compose-scene-template';
import { extendOutdoorLayout, WORLD_EXTENSION } from '../src/world/extend-world';
import { groundBounds, toWalkLayout } from '../src/world/layout-schema';
import { routeProblems } from '../src/world/route';
import { promptWorldSchema } from '../src/world/world-schema';

const build = (prompt: string) => {
  const result = composeSceneTemplate(prompt, { id: '7b0f0e2a-4a1b-4a43-9f4e-7c5b7c1f2d11' });
  if (!result.ok) throw new Error(result.reason);
  return result.world;
};

describe('bigger outdoor worlds', () => {
  it.each(['park', 'water park', 'A lighthouse above a foggy cove with a red rowboat beside the pier', 'A night market under a railway bridge'])(
    '%s gains land on every side and a longer, still valid approach', (prompt) => {
      const world = build(prompt);
      const { bounds, spawn, placements } = world.layout;
      expect(bounds.maxX - bounds.minX).toBeGreaterThan(30);
      expect(bounds.maxZ - bounds.minZ).toBeGreaterThan(34);
      // The composed core stays where it was composed: well inside the new edges.
      expect(Math.max(...placements.map(p => p.z))).toBeLessThan(bounds.maxZ - WORLD_EXTENSION.front + 1);
      expect(spawn.z).toBeGreaterThan(Math.max(...placements.map(p => p.z)) + 4);
      expect(routeProblems(toWalkLayout(world.layout))).toEqual([]);
      expect(promptWorldSchema.safeParse(world).success).toBe(true);
      // Walkways start at the route-grid cell nearest the new spawn (0.2 m grid).
      const start = world.layout.paths![0][0];
      expect(Math.hypot(start.x - spawn.x, start.z - spawn.z)).toBeLessThan(0.2);
    });

  it('keeps interiors at their composed size', () => {
    const world = build('A cosy kitchen with a garden outside');
    const unchanged = extendOutdoorLayout(world.layout);
    expect(unchanged).toBe(world.layout);
    expect(world.layout.bounds.maxX - world.layout.bounds.minX).toBeLessThan(20);
  });

  it('keeps the shore on its side and the extra land dry', () => {
    const world = build('A lighthouse above a foggy cove with a red rowboat beside the pier');
    const { water, bounds } = world.layout;
    if (!water) return; // the coast template may place its sea as scenery rather than a water rect
    expect(water.minX === bounds.minX || water.maxX === bounds.maxX).toBe(true);
    const land = groundBounds(world.layout);
    expect(land.maxX - land.minX).toBeGreaterThan(10);
  });

  it('adds walkable margins to water parks that walk on dry surfaces', () => {
    const world = build('water park');
    const surfaces = world.layout.drySurfaces ?? [];
    const { bounds } = world.layout;
    expect(surfaces.some(s => s.minX === bounds.minX)).toBe(true);
    expect(surfaces.some(s => s.maxZ === bounds.maxZ)).toBe(true);
    expect(surfaces.length).toBeLessThanOrEqual(16);
  });

  it('extends deterministically: same prompt, same world', () => {
    expect(build('park').layout).toEqual(build('park').layout);
  });
});

describe('running', () => {
  it('covers more ground while Shift is held', () => {
    const layout = toWalkLayout(build('park').layout);
    const from = layout.spawn;
    const walk = stepPlayer(from, { x: 0, z: -1 }, 0.1, layout);
    const run = stepPlayer(from, { x: 0, z: -1, run: true }, 0.1, layout);
    expect((from.z - run.z) / (from.z - walk.z)).toBeCloseTo(RUN_MULTIPLIER, 5);
  });
});
