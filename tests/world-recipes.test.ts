import { expect, test } from 'vitest';
import { getWorldApproach, getWorldFootprints, getWorldWalkableSurfaces, worldRecipeVersion } from '../src/scene/world-recipes';
import type { WorldLayout, WorldPlacement, WorldPoint } from '../src/scene/world-recipes';
import { examples } from '../src/scene/world-preview-examples';

function placement(recipe: WorldPlacement['recipe'], at: WorldPoint, options?: Partial<WorldPlacement>): WorldPlacement {
  return { id: recipe, recipe, at, heading: 0, ...options };
}

function expectWalkable(layout: WorldLayout, waypoints: WorldPoint[]) {
  const footprints = layout.placements.flatMap(getWorldFootprints);
  const surfaces = layout.placements.flatMap(getWorldWalkableSurfaces);
  const radius = 0.22;
  const route = [layout.spawn, ...waypoints, layout.ending.at];
  for (const anchor of [...layout.discoveries, layout.ending]) {
    expect(route).toContainEqual(anchor.at);
  }
  for (let leg = 1; leg < route.length; leg++) {
    const [fromX, fromZ] = route[leg - 1];
    const [toX, toZ] = route[leg];
    const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toZ - fromZ) / 0.05));
    for (let step = 0; step <= steps; step++) {
      const x = fromX + (toX - fromX) * step / steps;
      const z = fromZ + (toZ - fromZ) * step / steps;
      expect(x).toBeGreaterThanOrEqual(layout.bounds.minX + radius);
      expect(x).toBeLessThanOrEqual(layout.bounds.maxX - radius);
      expect(z).toBeGreaterThanOrEqual(layout.bounds.minZ + radius);
      expect(z).toBeLessThanOrEqual(layout.bounds.maxZ - radius);
      expect(surfaces.some((surface) => x >= surface.minX && x <= surface.maxX
        && z >= surface.minZ && z <= surface.maxZ)).toBe(true);
      expect(footprints.some((solid) => x > solid.minX - radius && x < solid.maxX + radius
        && z > solid.minZ - radius && z < solid.maxZ + radius), `Route clearance at ${x}, ${z}`).toBe(false);
    }
  }
}

test('the cove accommodates a ground-level route to two discoveries and the pier ending', () => {
  const { layout } = examples.cove;
  const [first, second] = layout.discoveries;
  expectWalkable(layout, [[0, 3], first.at, [second.at[0], -1], second.at, [second.at[0], -1], [2, -1]]);
});

test('the larger market links the far plaza to both discoveries and the exit lantern', () => {
  const { layout } = examples.market;
  const [first, second] = layout.discoveries;
  expectWalkable(layout, [[0, 1.4], first.at, [0, 1.4], [1.5, 1.5], [1.5, 2.5], second.at, [2.6, 3.28], [0, 3.28]]);
});

test.each([false, true])('the lantern route crosses covered and open ground (mixed: %s)', (mixed) => {
  const stall = placement('stall', [-2.5, 0]);
  const canopy = placement('canopy', stall.at);
  const lamp = placement('lamp', [2.4, 0]);
  const ending = mixed ? placement('lighthouse', [-0.7, 8]) : placement('lamp', [-0.7, 2.45], { id: 'exit' });
  const first = getWorldApproach(stall)!;
  const second = getWorldApproach(lamp)!;
  const layout: WorldLayout = {
    recipeVersion: worldRecipeVersion,
    bounds: { minX: -5, maxX: 5, minZ: -4, maxZ: mixed ? 11.8 : 4 },
    placements: [placement('paving', [0, 0]), placement('bridge', [0, 0]), stall, canopy, lamp, ending,
      ...(mixed ? [placement('shore', [0, 8]), placement('water', [0, 15.5])] : [])],
    spawn: [0, -2.5],
    discoveries: [{ objectId: stall.id, at: first }, { objectId: lamp.id, at: second }],
    ending: { objectId: ending.id, at: getWorldApproach(ending)! },
  };
  expectWalkable(layout, [[0, 1.4], first, [0, 1.4], second, [2.4, mixed ? 9.3 : 3.55]]);

  const moved = { ...canopy, at: lamp.at, heading: 1 as const };
  expect(moved.at).toEqual(lamp.at);
  expect(getWorldFootprints(moved)).not.toEqual(getWorldFootprints(canopy));
  expect(getWorldFootprints(placement('bridge', [0, 0]))).toHaveLength(2);
  expect(getWorldWalkableSurfaces(placement('water', [0, 0]))).toHaveLength(0);
});

test('quarter-turns and size variants transform the same bounds and approach used by scenery', () => {
  const boat = placement('rowboat', [2, 3], { heading: 1, variant: 'compact' });
  expect(getWorldFootprints(boat)).toEqual([{
    minX: expect.closeTo(1.34), maxX: expect.closeTo(2.66),
    minZ: expect.closeTo(2.66), maxZ: expect.closeTo(3.34),
  }]);
  expect(getWorldApproach(boat)).toEqual([2, 3 - 1.08 * 0.8]);
  const reopened: WorldPlacement = JSON.parse(JSON.stringify(boat));
  expect(getWorldFootprints(reopened)).toEqual(getWorldFootprints(boat));
  expect(getWorldApproach(reopened)).toEqual(getWorldApproach(boat));
});
