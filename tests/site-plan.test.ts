import { describe, expect, it } from 'vitest';
import { composeSceneTemplate } from '../src/world/compose-scene-template';
import { privateScenePlan } from '../src/world/local-scene-plan';
import { applySitePlan, stillPlayable } from '../src/world/site-plan';
import type { SitePlan } from '../src/world/site-plan';

const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
const market = 'A night market street with six stalls, four lanterns and two benches.';
// Two facing rows of stalls along the lane, lanterns down its middle, benches at the edges.
const rows: SitePlan = { version: 1, groups: [
  { feature: 0, spots: [-.5, -.1, .3].flatMap(z => [{ x: -.55, z }, { x: .55, z }]) },
  { feature: 1, spots: [.55, .2, -.15, -.5].map(z => ({ x: z > 0 ? .18 : -.18, z })) },
  { feature: 2, spots: [{ x: -.9, z: .7 }, { x: .9, z: .7 }] },
] };

describe('site plans', () => {
  const plan = privateScenePlan(market)!;
  const plain = composeSceneTemplate(market, { id, plan });
  const sited = composeSceneTemplate(market, { id, plan, site: rows });
  if (!plain.ok || !sited.ok) throw new Error('The market did not compose.');

  it('moves the scenery to the drawn spots and keeps the visit walkable', () => {
    const moved = sited.world.layout.placements.filter(p => {
      const before = plain.world.layout.placements.find(q => q.id === p.id);
      return before && (before.x !== p.x || before.z !== p.z);
    });
    expect(moved.length).toBeGreaterThanOrEqual(4);
    expect(stillPlayable(sited.world.layout)).toBe(true);
    // The stalls now stand in two rows on either side of the lane.
    const stalls = sited.world.layout.placements.filter(p => p.term === 0 && moved.includes(p));
    expect(stalls.some(p => p.x < 0) && stalls.some(p => p.x > 0)).toBe(true);
  });

  it('never moves the discoveries or the landmark', () => {
    const anchors = [...plain.world.layout.discoveries.map(d => d.placementId), plain.world.layout.landmark.placementId];
    for (const anchor of anchors) {
      const before = plain.world.layout.placements.find(p => p.id === anchor)!;
      const after = sited.world.layout.placements.find(p => p.id === anchor)!;
      expect([after.x, after.z]).toEqual([before.x, before.z]);
    }
  });

  it('undoes a spot that would wall off the visit', () => {
    // Every bench squeezed onto the spawn's doorstep is rejected rather than blocking the way in.
    const blocking: SitePlan = { version: 1, groups: [{ feature: 2, spots: [{ x: 0, z: 1 }, { x: 0, z: .95 }] }] };
    const { layout, moved } = applySitePlan(plain.world.layout, plan.template, blocking);
    expect(stillPlayable(layout)).toBe(true);
    expect(moved).toBe(0);
  });
});
