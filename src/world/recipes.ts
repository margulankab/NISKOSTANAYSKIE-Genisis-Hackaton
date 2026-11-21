/**
 * Recipe catalog: the B↔C seam. B's parser and composer only reference these IDs and footprints;
 * C owns the geometry behind each ID (see `builders.tsx`) and grows the catalog.
 */
import { getWorldFootprints, getWorldRecipe } from '../scene/world-recipes';
import type { WorldPlacement, WorldRecipeId } from '../scene/world-recipes';
import type { Solid } from '../gameplay/layout';
import { originalModel, originalModelIds } from './original-models';
import type { OriginalModelId } from './original-models';

export const RECIPE_CATALOG_VERSION = 2;

const legacyRecipeIds = [
  'lighthouse', 'tower', 'house', 'stall', 'bridge', 'pier', 'hill', 'gate',
  'boat', 'tree', 'lantern', 'lamp', 'bench', 'rock', 'crate', 'table', 'flower', 'marker', 'canopy',
] as const;
export const recipeIds = [...legacyRecipeIds, ...originalModelIds] as const;
export type RecipeId = (typeof recipeIds)[number];
export type LegacyRecipeId = (typeof legacyRecipeIds)[number];

export interface Recipe {
  label: string;
  /** Structures can serve as the closing landmark; props are preferred as discoveries. */
  role: 'structure' | 'prop';
  /** Approximate reservation radius for seeded placement. Runtime collision uses the geometry. */
  radius: number;
  /** Rough importance when choosing the closing landmark. */
  landmarkRank: number;
  /** Can stand in water (placed past the shore line). */
  aquatic?: boolean;
  /** Most copies a prompt may request. */
  maxCount: number;
}

const legacyRecipes: Record<LegacyRecipeId, Recipe> = {
  lighthouse: { label: 'Lighthouse', role: 'structure', radius: 0.8, landmarkRank: 10, maxCount: 1 },
  tower: { label: 'Tower', role: 'structure', radius: 0.9, landmarkRank: 8, maxCount: 2 },
  bridge: { label: 'Bridge', role: 'structure', radius: 0, landmarkRank: 7, maxCount: 1 },
  house: { label: 'House', role: 'structure', radius: 1.1, landmarkRank: 6, maxCount: 4 },
  canopy: { label: 'Canopy', role: 'structure', radius: 0, landmarkRank: 0, maxCount: 6 },
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
const expandedRecipes = Object.fromEntries(originalModelIds.map(id => {
  const { label, role, radius } = originalModel(id)!;
  return [id, { label, role, radius, landmarkRank: role === 'structure' ? 5 : 0, maxCount: 8 }];
})) as Record<OriginalModelId, Recipe>;
export const recipes: Record<RecipeId, Recipe> = { ...legacyRecipes, ...expandedRecipes };

// Shared with the JSX builders so fallback collision follows the visible models.
export const starterBoxes = {
  tower: [1.4, 3, 1.4], house: [2, 1.6, 1.6], gate: [0.38, 1.6, 0.38],
  lantern: [0.22, 0.3, 0.22], bench: [1.2, 0.08, 0.4],
  crate: [0.6, 0.6, 0.6], table: [1.1, 0.08, 0.7], marker: [0.5, 0.9, 0.22],
} satisfies Partial<Record<RecipeId, [number, number, number]>>;
export const starterRadii = { tree: 0.13, rock: 0.42 } as const;
export const gatePostX = 0.85;

const sceneryRecipes: Partial<Record<RecipeId, WorldRecipeId>> = {
  lighthouse: 'lighthouse', hill: 'hill', pier: 'pier', boat: 'rowboat',
  bridge: 'bridge', stall: 'stall', lamp: 'lamp', canopy: 'canopy',
};

type RecipePlacement = {
  id: string; recipe: RecipeId; x: number; y: number; z: number;
  scale: number; rotation: number; color: [number, number, number] | null;
};

export function sceneryPlacement(p: RecipePlacement): WorldPlacement | undefined {
  const recipe = sceneryRecipes[p.recipe];
  if (!recipe) return undefined;
  return {
    id: p.id, recipe, at: [p.x, p.z], height: p.y, sizeScale: p.scale,
    heading: (((Math.round(p.rotation / (Math.PI / 2)) % 4) + 4) % 4) as WorldPlacement['heading'],
    paint: p.color ? '#' + p.color.map((value) => value.toString(16).padStart(2, '0')).join('') : undefined,
  };
}

export function placementHeight(recipe: RecipeId) {
  const original = originalModel(recipe);
  if (original) return Math.max(...original.parts.map(({ at, size }) => at[1] + size[1] / 2));
  const scenery = sceneryRecipes[recipe];
  return scenery ? Math.max(...getWorldRecipe(scenery).parts.map(({ at, size }) => at[1] + size[1] / 2)) : undefined;
}

export function placementSolids(p: RecipePlacement): Solid[] {
  if (p.y > 0) return [];
  const original = originalModel(p.recipe);
  if (original) {
    if (p.recipe === 'entry-arch' || p.recipe === 'park-gate' || p.recipe === 'airlock' || p.recipe === 'doorway') {
      return original.parts.slice(0, 2).map(({ at: [x, , z], size }) => ({
        shape: 'circle',
        x: p.x + (Math.cos(p.rotation) * x + Math.sin(p.rotation) * z) * p.scale,
        z: p.z + (-Math.sin(p.rotation) * x + Math.cos(p.rotation) * z) * p.scale,
        radius: size[0] * p.scale / 2,
      }));
    }
    if (p.recipe === 'tube-slide' || p.recipe === 'open-flume') {
      return [
        { shape: 'circle', x: p.x, z: p.z, radius: original.radius * p.scale },
        { shape: 'circle', x: p.x + Math.sin(p.rotation) * 1.4 * p.scale,
          z: p.z + Math.cos(p.rotation) * 1.4 * p.scale, radius: .58 * p.scale },
      ];
    }
    return original.radius ? [{ shape: 'circle', x: p.x, z: p.z, radius: original.radius * p.scale }] : [];
  }
  const scenery = sceneryPlacement(p);
  if (scenery) return getWorldFootprints(scenery).map(({ minX, maxX, minZ, maxZ }) => ({
    shape: 'box', x: (minX + maxX) / 2, z: (minZ + maxZ) / 2,
    halfX: (maxX - minX) / 2, halfZ: (maxZ - minZ) / 2,
  }));
  if (p.recipe === 'tree' || p.recipe === 'rock') {
    return [{ shape: 'circle', x: p.x, z: p.z, radius: starterRadii[p.recipe] * p.scale }];
  }
  if (!Object.hasOwn(starterBoxes, p.recipe)) return [];
  const [width, , depth] = starterBoxes[p.recipe as keyof typeof starterBoxes];
  const cos = Math.cos(p.rotation), sin = Math.sin(p.rotation);
  const halfX = (width * Math.abs(cos) + depth * Math.abs(sin)) * p.scale / 2;
  const halfZ = (width * Math.abs(sin) + depth * Math.abs(cos)) * p.scale / 2;
  return (p.recipe === 'gate' ? [-gatePostX, gatePostX] : [0]).map((offset) => ({
    shape: 'box', x: p.x + offset * p.scale * cos, z: p.z - offset * p.scale * sin, halfX, halfZ,
  }));
}
