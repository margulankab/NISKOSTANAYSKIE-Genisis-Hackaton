import type { WorldLayout } from './layout-schema';

/**
 * Extra land added around a composed outdoor scene, in metres. The composed core (placements,
 * attachments such as pier-to-shore, approaches) is left exactly where the composer put it; the
 * player gains open ground on both sides, a longer approach from the front, and room behind the
 * landmark. Indoor and mixed indoor/outdoor scenes keep their composed size.
 */
export const WORLD_EXTENSION = { side: 8, front: 12, back: 6 } as const;
const LIMIT = 48;
const MAX_DRY_SURFACES = 16;

type Rect = WorldLayout['bounds'];
const clamp = (value: number) => Math.max(-LIMIT, Math.min(LIMIT, value));
const round = (value: number) => Math.round(value * 100) / 100;

export function extendOutdoorLayout(layout: WorldLayout, extension = WORLD_EXTENSION): WorldLayout {
  if (layout.indoor || layout.profile === 'interior') return layout;
  const old = layout.bounds;
  const bounds: Rect = {
    minX: clamp(old.minX - extension.side), maxX: clamp(old.maxX + extension.side),
    minZ: clamp(old.minZ - extension.back), maxZ: clamp(old.maxZ + extension.front),
  };
  let drySurfaces = layout.drySurfaces;
  if (drySurfaces) {
    const margins: Rect[] = [
      { minX: bounds.minX, maxX: old.minX, minZ: bounds.minZ, maxZ: bounds.maxZ },
      { minX: old.maxX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ },
      { minX: old.minX, maxX: old.maxX, minZ: bounds.minZ, maxZ: old.minZ },
      { minX: old.minX, maxX: old.maxX, minZ: old.maxZ, maxZ: bounds.maxZ },
    ];
    // A layout that cannot take four more surfaces keeps its original size.
    if (drySurfaces.length + margins.length > MAX_DRY_SURFACES) return layout;
    drySurfaces = [...drySurfaces, ...margins];
  }
  const water = layout.water
    ? layout.water.maxX === old.maxX
      ? { minX: layout.water.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ }
      : { minX: bounds.minX, maxX: layout.water.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ }
    : null;
  // The walk now starts further out, so the scene is approached rather than spawned into.
  const spawn = { x: layout.spawn.x, z: round(Math.min(bounds.maxZ - 2.5, layout.spawn.z + extension.front - 2.5)) };
  return { ...layout, bounds, water, spawn, ...(drySurfaces && { drySurfaces }) };
}

