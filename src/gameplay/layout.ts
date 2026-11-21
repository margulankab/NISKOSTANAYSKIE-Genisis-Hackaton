import type { SceneStyle } from '../scene/scene-style';

/** Ground-plane position in world units (x right, z toward the camera). */
export interface Point { x: number; z: number }
export type Solid =
  | { shape: 'circle'; x: number; z: number; radius: number }
  | { shape: 'box'; x: number; z: number; halfX: number; halfZ: number };

/**
 * Runtime contract between gameplay (A) and level content (C):
 * where the player starts, where they may walk, what blocks them,
 * where the two artifacts and the closing landmark stand.
 */
export interface WalkLayout {
  spawn: Point;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  solids: Solid[];
  artifacts: [Point, Point];
  landmark: Point;
  playerRadius: number;
  reach: number;
}

export const WORLD_SCALE = 2;

/** Deterministic default layout derived from the saved scene style (same manifest, same layout). */
export function createWalkLayout({ artifactSpacing, variation }: Pick<SceneStyle, 'artifactSpacing' | 'variation'>): WalkLayout {
  const half = artifactSpacing * WORLD_SCALE / 2;
  const artifacts: [Point, Point] = [{ x: -half, z: 0.2 }, { x: half, z: 0.2 }];
  const landmark = { x: 0, z: -1.5 };
  const gate = 0.85;
  return {
    spawn: { x: 0, z: 3 },
    bounds: { minX: -(half + 2.6), maxX: half + 2.6, minZ: -2.1, maxZ: 3.8 },
    solids: [
      ...artifacts.map((a): Solid => ({ shape: 'circle', x: a.x, z: a.z, radius: 0.6 })),
      { shape: 'circle', x: landmark.x - gate, z: landmark.z, radius: 0.3 },
      { shape: 'circle', x: landmark.x + gate, z: landmark.z, radius: 0.3 },
      // A planter beside the artifacts, never on an approach lane.
      { shape: 'box', x: (variation[0] < 0.5 ? -1 : 1) * (half + 1.5), z: 1.6, halfX: 0.6, halfZ: 0.3 },
    ],
    artifacts,
    landmark,
    playerRadius: 0.3,
    reach: 1.7,
  };
}
