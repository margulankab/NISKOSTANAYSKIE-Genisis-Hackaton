import { blocked, targetAt } from '../gameplay/controller';
import type { Target } from '../gameplay/controller';
import type { Point, WalkLayout } from '../gameplay/layout';

const CELL = 0.2;

/** Walkable grid cells reachable from spawn using the same collision rules as A's controller. */
export function reachableCells(layout: WalkLayout): Point[] {
  const { bounds: { minX, maxX, minZ, maxZ }, playerRadius: r, spawn } = layout;
  const columns = Math.floor((maxX - minX - 2 * r) / CELL) + 1;
  const rows = Math.floor((maxZ - minZ - 2 * r) / CELL) + 1;
  const toPoint = (c: number, w: number) => ({ x: minX + r + c * CELL, z: minZ + r + w * CELL });
  const start = [Math.round((spawn.x - minX - r) / CELL), Math.round((spawn.z - minZ - r) / CELL)];
  if (blocked(spawn, layout) || start[0] < 0 || start[1] < 0 || start[0] >= columns || start[1] >= rows) return [];
  const seen = new Uint8Array(columns * rows);
  const queue = [start];
  const cells: Point[] = [];
  seen[start[1] * columns + start[0]] = 1;
  while (queue.length) {
    const [c, w] = queue.pop()!;
    cells.push(toPoint(c, w));
    for (const [dc, dw] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nw = w + dw;
      if (nc < 0 || nw < 0 || nc >= columns || nw >= rows || seen[nw * columns + nc]) continue;
      seen[nw * columns + nc] = 1;
      if (!blocked(toPoint(nc, nw), layout)) queue.push([nc, nw]);
    }
  }
  return cells;
}

const same = (a: Target | null, b: Target) =>
  a?.kind === b.kind && (a.kind === 'artifact' ? b.kind === 'artifact' && a.index === b.index : true);

/** Problems that would stop a full visit: each discovery and the ready ending must be activatable from a reachable spot. */
export function routeProblems(layout: WalkLayout): string[] {
  const cells = reachableCells(layout);
  if (cells.length === 0) return ['The spawn point is blocked.'];
  const goals: [string, Target][] = [
    ['first discovery', { kind: 'artifact', index: 0 }],
    ['second discovery', { kind: 'artifact', index: 1 }],
    ['ending', { kind: 'ending', ready: true }],
  ];
  return goals
    .filter(([, goal]) => !cells.some((cell) => same(targetAt(cell, layout, 2), goal)))
    .map(([name]) => `The ${name} cannot be reached from spawn.`);
}

/** Shortest grid route to a spot that activates the goal, as straight-line corner waypoints. */
export function routeTo(layout: WalkLayout, goal: Target, from: Point = layout.spawn): Point[] | undefined {
  // Prefer stopping comfortably inside reach rather than at its edge.
  return findRoute(layout, goal, from, 0.35) ?? findRoute(layout, goal, from, 0);
}

function findRoute(layout: WalkLayout, goal: Target, from: Point, margin: number): Point[] | undefined {
  const anchor = goal.kind === 'artifact' ? layout.artifacts[goal.index] : layout.landmark;
  const { bounds: { minX, maxX, minZ, maxZ }, playerRadius: r } = layout;
  const spawn = from;
  const columns = Math.floor((maxX - minX - 2 * r) / CELL) + 1;
  const rows = Math.floor((maxZ - minZ - 2 * r) / CELL) + 1;
  const toPoint = (cell: number) => ({ x: minX + r + (cell % columns) * CELL, z: minZ + r + Math.floor(cell / columns) * CELL });
  const start = Math.round((spawn.z - minZ - r) / CELL) * columns + Math.round((spawn.x - minX - r) / CELL);
  const parent = new Int32Array(columns * rows).fill(-2);
  parent[start] = -1;
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    const point = toPoint(cell);
    if (same(targetAt(point, layout, 2), goal)
      && Math.hypot(point.x - anchor.x, point.z - anchor.z) <= layout.reach - margin) {
      const cells: number[] = [];
      for (let at = cell; at !== -1; at = parent[at]) cells.unshift(at);
      // Keep only the corners of the route.
      return cells.filter((c, i) => i === 0 || i === cells.length - 1
        || (cells[i - 1] % columns === c % columns) !== (c % columns === cells[i + 1] % columns)).map(toPoint);
    }
    const c = cell % columns, w = Math.floor(cell / columns);
    for (const [dc, dw] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nw = w + dw, next = nw * columns + nc;
      if (nc < 0 || nw < 0 || nc >= columns || nw >= rows || parent[next] !== -2) continue;
      parent[next] = cell;
      if (!blocked(toPoint(next), layout)) queue.push(next);
    }
  }
  return undefined;
}
