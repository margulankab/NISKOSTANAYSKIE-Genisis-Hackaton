export const worldRecipeVersion = 1;

type Vector3 = [number, number, number];
export type WorldPoint = readonly [x: number, z: number];
export type WorldBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
type Heading = 0 | 1 | 2 | 3;

type Part = {
  at: Vector3;
  size: Vector3;
  color: string;
  shape?: 'cylinder' | 'cone' | 'hull';
  solid?: boolean;
  walkable?: boolean;
  accent?: boolean;
  emissive?: boolean;
};

type Recipe = {
  terms: readonly string[];
  parts: readonly Part[];
  approach?: WorldPoint;
};

const coveRecipes = {
  shore: {
    terms: ['shore', 'coast', 'cove', 'beach'],
    parts: [
      { at: [0, -0.34, 0], size: [12, 0.68, 8], color: '#9b855f', walkable: true },
      { at: [0, -0.025, 1.1], size: [10, 0.07, 4.9], color: '#c4a878' },
    ],
  },
  dunes: {
    terms: ['dune', 'sand dunes', 'sandy ground'],
    parts: [
      { at: [0, -0.34, 0], size: [12, 0.68, 8], color: '#a38d65', walkable: true },
      { at: [-3.45, 0.05, -0.45], size: [2.8, 0.28, 2.2], color: '#ad9669', shape: 'hull' },
      { at: [-2.1, 0.025, 1.45], size: [2.5, 0.16, 1.45], color: '#b59b6e', shape: 'hull' },
    ],
  },
  water: {
    terms: ['water', 'sea', 'ocean'],
    parts: [
      { at: [0, -0.36, 0], size: [14, 0.26, 8], color: '#3e777f' },
      { at: [-2.5, -0.225, -0.5], size: [4, 0.01, 0.045], color: '#82a8a1', emissive: true },
      { at: [2, -0.225, 1.1], size: [3.2, 0.01, 0.045], color: '#6a928c', emissive: true },
    ],
  },
  hill: {
    terms: ['hill', 'bluff', 'headland'],
    approach: [0, 1.95],
    parts: [
      { at: [0, 0.22, 0], size: [3, 0.44, 2.6], color: '#737557', solid: true, accent: true },
      { at: [-0.35, 0.58, -0.14], size: [2, 0.38, 1.85], color: '#828364' },
    ],
  },
  coastalRocks: {
    terms: ['coastal rocks', 'rocks', 'boulders'],
    parts: [
      { at: [-0.47, 0.31, 0.13], size: [0.98, 0.65, 0.8], color: '#777970', shape: 'hull', solid: true },
      { at: [0.18, 0.49, -0.19], size: [1.14, 1.02, 0.94], color: '#666e65', shape: 'hull', solid: true },
      { at: [0.8, 0.18, 0.32], size: [0.64, 0.4, 0.55], color: '#8a8875', shape: 'hull', solid: true },
    ],
  },
  duneGrass: {
    terms: ['dune grass', 'coastal grass'],
    parts: [
      { at: [-0.22, 0.18, -0.14], size: [0.3, 0.36, 0.3], color: '#78845d', shape: 'cone' },
      { at: [0.11, 0.24, 0.03], size: [0.31, 0.48, 0.31], color: '#90946a', shape: 'cone' },
      { at: [0.38, 0.14, -0.13], size: [0.22, 0.28, 0.22], color: '#6e7756', shape: 'cone' },
    ],
  },
  lighthouse: {
    terms: ['lighthouse', 'beacon', 'light tower'],
    approach: [0, 1.15],
    parts: [
      { at: [0, 0.15, 0], size: [1.2, 0.3, 1.2], color: '#8d826e', solid: true },
      { at: [0, 1.44, 0], size: [0.92, 2.28, 0.92], color: '#eee2c3', shape: 'cylinder' },
      { at: [0, 1.81, 0], size: [0.95, 0.43, 0.95], color: '#a64d3f', shape: 'cylinder', accent: true },
      { at: [0, 2.67, 0], size: [1.1, 0.18, 1.1], color: '#483e38', shape: 'cylinder' },
      { at: [0, 2.96, 0], size: [0.71, 0.43, 0.71], color: '#f9d196', shape: 'cylinder', emissive: true },
      { at: [0, 3.34, 0], size: [1, 0.44, 1], color: '#a64d3f', shape: 'cone', accent: true },
    ],
  },
  pier: {
    terms: ['pier', 'dock', 'jetty'],
    approach: [0, 0],
    parts: [
      { at: [0, -0.069, 0], size: [1.5, 0.16, 3.4], color: '#8b6d52', walkable: true, accent: true },
      { at: [-0.65, -0.22, -1.46], size: [0.16, 0.84, 0.16], color: '#56483e', solid: true },
      { at: [0.65, -0.22, -1.46], size: [0.16, 0.84, 0.16], color: '#56483e', solid: true },
      { at: [-0.65, 0.19, -0.5], size: [0.12, 0.38, 2], color: '#69534a', solid: true },
      { at: [0.65, 0.19, -0.5], size: [0.12, 0.38, 2], color: '#69534a', solid: true },
    ],
  },
  rowboat: {
    terms: ['rowboat', 'boat', 'skiff'],
    approach: [1.08, 0],
    parts: [
      { at: [0, 0.07, 0], size: [0.85, 0.24, 1.65], color: '#aa5346', shape: 'hull', accent: true, solid: true },
      { at: [0, 0.2, 0], size: [0.67, 0.08, 1.38], color: '#653f33' },
      { at: [0, 0.26, 0.17], size: [0.67, 0.075, 0.22], color: '#cc9f68' },
      { at: [0, 0.26, -0.34], size: [0.67, 0.075, 0.22], color: '#cc9f68' },
    ],
  },
} satisfies Record<string, Recipe>;

const marketRecipes = {
  paving: {
    terms: ['paving', 'plaza', 'courtyard', 'market'],
    parts: [
      { at: [0, -0.25, 0], size: [10, 0.5, 8], color: '#7f766e', walkable: true },
      { at: [0, 0.002, 0], size: [2.4, 0.02, 8], color: '#a39585' },
    ],
  },
  marketCourt: {
    terms: ['market court', 'side plaza'],
    parts: [
      { at: [0, -0.25, 0], size: [10, 0.5, 8], color: '#756b65', walkable: true },
      { at: [-4.3, 0.005, 0], size: [0.1, 0.02, 7.8], color: '#9c8d7b' },
      { at: [4.3, 0.005, 0], size: [0.1, 0.02, 7.8], color: '#9c8d7b' },
    ],
  },
  bridge: {
    terms: ['bridge', 'railway bridge', 'overpass'],
    parts: [
      { at: [-3.9, 1.75, 0], size: [0.65, 3.5, 2.6], color: '#676269', solid: true },
      { at: [3.9, 1.75, 0], size: [0.65, 3.5, 2.6], color: '#676269', solid: true },
      { at: [0, 3.65, 0], size: [9, 0.44, 3], color: '#6a6370' },
      { at: [0, 3.99, -1.26], size: [9, 0.44, 0.2], color: '#a07767' },
      { at: [0, 3.99, 1.26], size: [9, 0.44, 0.2], color: '#a07767' },
    ],
  },
  stall: {
    terms: ['stall', 'booth', 'market stall', 'vendor'],
    approach: [0, 1.14],
    parts: [
      { at: [0, 0.44, 0], size: [1.8, 0.88, 1.15], color: '#835d49', solid: true },
      { at: [0, 0.91, 0], size: [1.85, 0.14, 1.2], color: '#bc9a71' },
      { at: [-0.52, 1.07, -0.08], size: [0.47, 0.24, 0.42], color: '#c3985a', accent: true },
      { at: [0.28, 1.1, -0.12], size: [0.52, 0.3, 0.46], color: '#687b52' },
    ],
  },
  canopy: {
    terms: ['canopy', 'awning', 'shelter'],
    parts: [
      { at: [-1.07, 1.13, -0.69], size: [0.14, 2.26, 0.14], color: '#675448', solid: true },
      { at: [1.07, 1.13, -0.69], size: [0.14, 2.26, 0.14], color: '#675448', solid: true },
      { at: [-1.07, 1.13, 0.69], size: [0.14, 2.26, 0.14], color: '#675448', solid: true },
      { at: [1.07, 1.13, 0.69], size: [0.14, 2.26, 0.14], color: '#675448', solid: true },
      { at: [0, 2.3, 0], size: [2.5, 0.16, 1.7], color: '#a9564a', accent: true },
    ],
  },
  lamp: {
    terms: ['lamp', 'lantern', 'lamppost', 'light'],
    approach: [0, 0.78],
    parts: [
      { at: [0, 1.1, 0], size: [0.18, 2.2, 0.18], color: '#645046', solid: true },
      { at: [0, 2.27, 0], size: [0.44, 0.44, 0.44], color: '#f0c586', emissive: true, accent: true },
      { at: [0, 2.52, 0], size: [0.56, 0.12, 0.56], color: '#765949' },
    ],
  },
  marketFacade: {
    terms: ['market building', 'shopfront', 'facade'],
    parts: [
      { at: [0, 1.8, 0], size: [3.8, 3.6, 2.65], color: '#62545c', solid: true },
      { at: [0, 3.65, 0], size: [4.02, 0.28, 2.82], color: '#3e3a49' },
      { at: [-1.02, 2.45, 1.34], size: [0.65, 0.79, 0.06], color: '#d8a471', emissive: true },
      { at: [1.02, 2.45, 1.34], size: [0.65, 0.79, 0.06], color: '#ad7f60', emissive: true },
      { at: [0, 0.83, 1.34], size: [0.8, 1.66, 0.06], color: '#3b333e' },
      { at: [0, 1.85, 1.54], size: [2.4, 0.16, 0.51], color: '#806456', accent: true },
    ],
  },
} satisfies Record<string, Recipe>;

export const worldRecipes = { ...coveRecipes, ...marketRecipes };
export type WorldRecipeId = keyof typeof worldRecipes;
export type WorldPlacement = {
  id: string;
  recipe: WorldRecipeId;
  at: WorldPoint;
  heading: Heading;
  height?: number;
  sizeScale?: number;
  paint?: string;
  variant?: 'standard' | 'compact' | 'large';
  accent?: 'red' | 'blue' | 'green' | 'gold';
};

export type WorldAnchor = { objectId: string; at: WorldPoint };
export type WorldLayout = {
  recipeVersion: typeof worldRecipeVersion;
  bounds: WorldBounds;
  placements: readonly WorldPlacement[];
  spawn: WorldPoint;
  discoveries: readonly [WorldAnchor, WorldAnchor];
  ending: WorldAnchor;
};

export const worldVariants = { standard: 1, compact: 0.8, large: 1.15 };
export const worldAccents = { red: '#b94d40', blue: '#417d9b', green: '#497751', gold: '#d6a055' };

export function getWorldRecipe(id: WorldRecipeId): Recipe {
  return worldRecipes[id];
}

export function placementScale(placement: WorldPlacement) {
  return placement.sizeScale ?? worldVariants[placement.variant ?? 'standard'];
}

function toWorld(point: WorldPoint, placement: WorldPlacement): WorldPoint {
  const [x, z] = point;
  const turned = [[x, z], [z, -x], [-x, -z], [-z, x]][placement.heading];
  const scale = placementScale(placement);
  return [placement.at[0] + turned[0] * scale, placement.at[1] + turned[1] * scale];
}

export function getWorldApproach(placement: WorldPlacement): WorldPoint | undefined {
  const approach = getWorldRecipe(placement.recipe).approach;
  return approach && toWorld(approach, placement);
}

export function getWorldFootprints(placement: WorldPlacement): WorldBounds[] {
  return getPartBounds(placement, (part) => !!part.solid);
}

export function getWorldWalkableSurfaces(placement: WorldPlacement): WorldBounds[] {
  return getPartBounds(placement, (part) => !!part.walkable);
}

function getPartBounds(placement: WorldPlacement, include: (part: Part) => boolean): WorldBounds[] {
  const scale = placementScale(placement);
  const sideways = placement.heading % 2 !== 0;
  return getWorldRecipe(placement.recipe).parts.filter(include).map(({ at, size }) => {
    const [x, z] = toWorld([at[0], at[2]], placement);
    const halfX = size[sideways ? 2 : 0] * scale / 2;
    const halfZ = size[sideways ? 0 : 2] * scale / 2;
    return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
  });
}
