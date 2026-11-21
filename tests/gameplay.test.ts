import { describe, expect, it } from 'vitest';
import { blocked, stepPlayer, targetAt } from '../src/gameplay/controller';
import { createWalkLayout } from '../src/gameplay/layout';

const layout = createWalkLayout({ artifactSpacing: 2.4, variation: [0.5, 0, 0, 0, 0] });

function walk(from: { x: number; z: number }, input: { x: number; z: number }, seconds: number) {
  let p = from;
  for (let i = 0; i < seconds * 60; i += 1) p = stepPlayer(p, input, 1 / 60, layout);
  return p;
}

describe('walk layout', () => {
  it('is deterministic and spawns clear of solids', () => {
    expect(createWalkLayout({ artifactSpacing: 2.4, variation: [0.5, 0, 0, 0, 0] })).toEqual(layout);
    expect(blocked(layout.spawn, layout)).toBe(false);
  });
});

describe('approach lanes', () => {
  it('keep every artifact and the gate reachable by walking straight up from the front edge', () => {
    for (const spacing of [1.8, 2.2, 2.7]) {
      for (const v of [0, 0.49, 0.5, 1]) {
        const l = createWalkLayout({ artifactSpacing: spacing, variation: [v, v, v, v, v] });
        for (const goal of [...l.artifacts, l.landmark]) {
          let p = { x: goal.x, z: l.spawn.z };
          expect(blocked(p, l)).toBe(false);
          for (let i = 0; i < 600 && Math.hypot(p.x - goal.x, p.z - goal.z) > l.reach - 0.4; i += 1) {
            p = stepPlayer(p, { x: 0, z: -1 }, 1 / 60, l);
          }
          expect(Math.hypot(p.x - goal.x, p.z - goal.z)).toBeLessThanOrEqual(l.reach);
        }
      }
    }
  });
});

describe('player movement', () => {
  it('moves with input and normalizes diagonals', () => {
    const straight = walk(layout.spawn, { x: 1, z: 0 }, 0.2);
    const diagonal = walk(layout.spawn, { x: 1, z: 1 }, 0.2);
    expect(straight.x).toBeGreaterThan(layout.spawn.x);
    expect(Math.hypot(diagonal.x, diagonal.z - layout.spawn.z)).toBeCloseTo(Math.hypot(straight.x - layout.spawn.x, 0), 1);
  });
  it('stays inside bounds', () => {
    const p = walk(layout.spawn, { x: -1, z: -1 }, 20);
    expect(p.x).toBeGreaterThanOrEqual(layout.bounds.minX + layout.playerRadius - 1e-9);
    expect(p.z).toBeGreaterThanOrEqual(layout.bounds.minZ + layout.playerRadius - 1e-9);
  });
  it('never enters a solid and slides along it', () => {
    let p = { x: layout.artifacts[0].x, z: layout.artifacts[0].z + 1.5 };
    for (let i = 0; i < 600; i += 1) {
      p = stepPlayer(p, { x: 0, z: -1 }, 1 / 60, layout);
      expect(blocked(p, layout)).toBe(false);
    }
    expect(p.z).toBeGreaterThan(layout.artifacts[0].z);
    const slid = walk({ x: layout.artifacts[0].x + 0.4, z: layout.artifacts[0].z + 1.0 }, { x: 0.3, z: -1 }, 1);
    expect(blocked(slid, layout)).toBe(false);
  });
  it('does not move without input', () => {
    expect(stepPlayer(layout.spawn, { x: 0, z: 0 }, 1, layout)).toBe(layout.spawn);
  });
});

describe('interaction targets', () => {
  it('requires reach for artifacts', () => {
    expect(targetAt(layout.spawn, layout, 0)).toBeNull();
    const beside = { x: layout.artifacts[1].x, z: layout.artifacts[1].z + 1.2 };
    expect(targetAt(beside, layout, 0)).toEqual({ kind: 'artifact', index: 1 });
  });
  it('locks the ending until both reveals exist', () => {
    const gate = { x: layout.landmark.x, z: layout.landmark.z + 0.9 };
    expect(blocked(gate, layout)).toBe(false);
    expect(targetAt(gate, layout, 1)).toEqual({ kind: 'ending', ready: false });
    expect(targetAt(gate, layout, 2)).toEqual({ kind: 'ending', ready: true });
  });
  it('can reach both artifacts and the ending from spawn', () => {
    // Route along the open front edge first so a planter cannot trap a straight-line steer.
    for (const goal of [layout.artifacts[0], layout.artifacts[1], layout.landmark]) {
      let p = layout.spawn;
      for (const via of [{ x: goal.x, z: layout.spawn.z }, goal]) {
        for (let i = 0; i < 1200 && Math.hypot(p.x - via.x, p.z - via.z) > 0.1
          && Math.hypot(p.x - goal.x, p.z - goal.z) > layout.reach - 0.2; i += 1) {
          const dx = via.x - p.x, dz = via.z - p.z, len = Math.hypot(dx, dz);
          p = stepPlayer(p, { x: dx / len, z: dz / len }, 1 / 60, layout);
        }
      }
      expect(Math.hypot(p.x - goal.x, p.z - goal.z)).toBeLessThanOrEqual(layout.reach);
    }
  });
});
