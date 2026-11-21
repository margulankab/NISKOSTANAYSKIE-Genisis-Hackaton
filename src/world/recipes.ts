/**
 * Recipe catalog: the B↔C seam. B's parser and composer only reference these IDs and footprints;
 * C owns the geometry behind each ID (see `builders.tsx`) and grows the catalog.
 */
export const RECIPE_CATALOG_VERSION = 1;

export const recipeIds = [
  'lighthouse', 'tower', 'house', 'stall', 'bridge', 'pier', 'hill', 'gate',
  'boat', 'tree', 'lantern', 'lamp', 'bench', 'rock', 'crate', 'table', 'flower', 'marker',
] as const;
export type RecipeId = (typeof recipeIds)[number];

export interface Recipe {
  label: string;
  /** Structures can serve as the closing landmark; props are preferred as discoveries. */
  role: 'structure' | 'prop';
  /** Collision footprint radius in world units at scale 1; 0 means walk-through or non-blocking. */
  radius: number;
  /** Rough importance when choosing the closing landmark. */
  landmarkRank: number;
  /** Can stand in water (placed past the shore line). */
  aquatic?: boolean;
  /** Most copies a prompt may request. */
  maxCount: number;
}

export const recipes: Record<RecipeId, Recipe> = {
  lighthouse: { label: 'Lighthouse', role: 'structure', radius: 0.8, landmarkRank: 10, maxCount: 1 },
  tower: { label: 'Tower', role: 'structure', radius: 0.9, landmarkRank: 8, maxCount: 2 },
  bridge: { label: 'Bridge', role: 'structure', radius: 0, landmarkRank: 7, maxCount: 1 },
  house: { label: 'House', role: 'structure', radius: 1.1, landmarkRank: 6, maxCount: 4 },
  stall: { label: 'Market stall', role: 'structure', radius: 0.7, landmarkRank: 4, maxCount: 6 },
  pier: { label: 'Pier', role: 'structure', radius: 0, landmarkRank: 3, aquatic: true, maxCount: 1 },
  hill: { label: 'Hill', role: 'structure', radius: 0, landmarkRank: 2, maxCount: 1 },
  gate: { label: 'Closing gate', role: 'structure', radius: 0, landmarkRank: 1, maxCount: 1 },
  boat: { label: 'Boat', role: 'prop', radius: 0, landmarkRank: 0, aquatic: true, maxCount: 4 },
  tree: { label: 'Tree', role: 'prop', radius: 0.35, landmarkRank: 0, maxCount: 8 },
  lantern: { label: 'Lantern', role: 'prop', radius: 0.15, landmarkRank: 0, maxCount: 8 },
  lamp: { label: 'Street lamp', role: 'prop', radius: 0.15, landmarkRank: 0, maxCount: 6 },
  bench: { label: 'Bench', role: 'prop', radius: 0.45, landmarkRank: 0, maxCount: 4 },
  rock: { label: 'Rock', role: 'prop', radius: 0.4, landmarkRank: 0, maxCount: 6 },
  crate: { label: 'Crate', role: 'prop', radius: 0.35, landmarkRank: 0, maxCount: 6 },
  table: { label: 'Table', role: 'prop', radius: 0.5, landmarkRank: 0, maxCount: 4 },
  flower: { label: 'Flowers', role: 'prop', radius: 0, landmarkRank: 0, maxCount: 8 },
  marker: { label: 'Memory stone', role: 'prop', radius: 0.3, landmarkRank: 0, maxCount: 2 },
};
