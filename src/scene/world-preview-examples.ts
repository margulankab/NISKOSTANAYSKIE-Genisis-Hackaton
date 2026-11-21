import type { WorldAtmosphere } from './WorldScenery';
import { worldRecipeVersion } from './world-recipes';
import type { WorldLayout } from './world-recipes';

export type Example = {
  title: string;
  atmosphere: WorldAtmosphere;
  description: string;
  overview: CameraView;
  landmarks: readonly [Landmark, Landmark, Landmark];
  layout: WorldLayout;
};

type Vector3 = [number, number, number];
export type CameraView = { offset: Vector3; target: Vector3 };
type Landmark = { name: string; height: number; offset: Vector3 };

export const examples = {
  cove: {
    title: 'Foggy cove',
    atmosphere: 'fog',
    description: 'From the shore, the route leads to the lighthouse and red rowboat before ending at the pier.',
    overview: { target: [-2.7, 0.35, -1.05], offset: [5.7, 6.75, 14.3] },
    landmarks: [
      { name: 'Lighthouse', height: 1.55, offset: [2.5, 1.9, 4.6] },
      { name: 'Red rowboat', height: 0.25, offset: [2.4, 2.3, 3] },
      { name: 'Pier', height: 0.2, offset: [2.8, 2.7, 3.7] },
    ],
    layout: {
      recipeVersion: worldRecipeVersion,
      bounds: { minX: -18, maxX: 6, minZ: -3.95, maxZ: 12 },
      placements: [
        { id: 'land', recipe: 'shore', at: [0, 0], heading: 0 },
        { id: 'west-shore', recipe: 'dunes', at: [-12, 0], heading: 2 },
        { id: 'shore-approach', recipe: 'dunes', at: [0, 8], heading: 0 },
        { id: 'west-dunes', recipe: 'dunes', at: [-12, 8], heading: 2 },
        { id: 'sea', recipe: 'water', at: [0, -7], heading: 0 },
        { id: 'west-sea', recipe: 'water', at: [-14, -7], heading: 0 },
        { id: 'outer-sea', recipe: 'water', at: [-5, -15.6], heading: 0, variant: 'large' },
        { id: 'bluff', recipe: 'hill', at: [-4.2, -3.7], heading: 0 },
        { id: 'west-bluff', recipe: 'hill', at: [-11, -2.4], heading: 1, variant: 'large' },
        { id: 'bluff-rocks', recipe: 'coastalRocks', at: [-9, -2.6], heading: 1, variant: 'large' },
        { id: 'shore-rocks', recipe: 'coastalRocks', at: [-6.9, -1.3], heading: 2 },
        { id: 'west-rocks', recipe: 'coastalRocks', at: [-13.5, -2.5], heading: 0 },
        { id: 'trail-rocks', recipe: 'coastalRocks', at: [3.2, 6.2], heading: 1, variant: 'compact' },
        { id: 'west-grass', recipe: 'duneGrass', at: [-7.2, 1.3], heading: 1, variant: 'large' },
        { id: 'bluff-grass', recipe: 'duneGrass', at: [-5.6, -1.4], heading: 0 },
        { id: 'trail-grass-west', recipe: 'duneGrass', at: [-2.7, 5.7], heading: 1 },
        { id: 'trail-grass-east', recipe: 'duneGrass', at: [2.4, 4.3], heading: 3, variant: 'large' },
        { id: 'outer-grass', recipe: 'duneGrass', at: [-3.4, 8.1], heading: 2 },
        { id: 'dune-rocks', recipe: 'coastalRocks', at: [-10.3, 3], heading: 3 },
        { id: 'dune-grass-west', recipe: 'duneGrass', at: [-10.7, 4.1], heading: 0, variant: 'large' },
        { id: 'dune-grass-east', recipe: 'duneGrass', at: [-7.1, 4.5], heading: 0, variant: 'large' },
        { id: 'tower', recipe: 'lighthouse', at: [-2.9, -2.4], heading: 0 },
        { id: 'dock', recipe: 'pier', at: [2, -3.25], heading: 0 },
        { id: 'boat', recipe: 'rowboat', at: [3.5, -3.45], heading: 0, accent: 'red' },
      ],
      spawn: [0, 8.8],
      discoveries: [{ objectId: 'tower', at: [-2.9, -1.25] }, { objectId: 'boat', at: [4.58, -3.45] }],
      ending: { objectId: 'dock', at: [2, -3.25] },
    },
  },
  market: {
    title: 'Covered night market',
    atmosphere: 'night',
    description: 'The route passes beneath the railway bridge to a market stall, then crosses the plaza to the market lantern and exit lantern.',
    overview: { target: [0, 0.85, -0.7], offset: [5, 7.2, 16] },
    landmarks: [
      { name: 'Market stall', height: 1.15, offset: [1.15, 0.7, 4.2] },
      { name: 'Market lantern', height: 1.5, offset: [1.6, 0.8, 3.5] },
      { name: 'Exit lantern', height: 1.35, offset: [-1.6, 0.8, 3.7] },
    ],
    layout: {
      recipeVersion: worldRecipeVersion,
      bounds: { minX: -15, maxX: 15, minZ: -12, maxZ: 12 },
      placements: [
        { id: 'plaza', recipe: 'paving', at: [0, 0], heading: 0 },
        { id: 'north-plaza', recipe: 'paving', at: [0, -8], heading: 0 },
        { id: 'west-plaza', recipe: 'marketCourt', at: [-10, -4], heading: 0 },
        { id: 'east-plaza', recipe: 'marketCourt', at: [10, -4], heading: 0 },
        { id: 'west-court', recipe: 'marketCourt', at: [-10, 4], heading: 0 },
        { id: 'east-court', recipe: 'marketCourt', at: [10, 4], heading: 0 },
        { id: 'market-entry', recipe: 'paving', at: [0, 8], heading: 0 },
        { id: 'railway', recipe: 'bridge', at: [0, 0], heading: 0 },
        { id: 'west-railway', recipe: 'bridge', at: [-9, 0], heading: 0 },
        { id: 'east-railway', recipe: 'bridge', at: [9, 0], heading: 0 },
        { id: 'west-shop', recipe: 'marketFacade', at: [-7.5, -6.3], heading: 0, accent: 'red' },
        { id: 'north-shop', recipe: 'marketFacade', at: [-2.6, -9], heading: 0, variant: 'large' },
        { id: 'corner-shop', recipe: 'marketFacade', at: [2.5, -8.4], heading: 0, accent: 'green' },
        { id: 'east-shop', recipe: 'marketFacade', at: [7.8, -5.8], heading: 0, accent: 'blue' },
        { id: 'west-stall', recipe: 'stall', at: [-2.5, 0], heading: 0 },
        { id: 'west-canopy', recipe: 'canopy', at: [-2.5, 0], heading: 0 },
        { id: 'east-stall', recipe: 'stall', at: [2.1, -0.25], heading: 0, accent: 'gold' },
        { id: 'east-canopy', recipe: 'canopy', at: [2.1, -0.25], heading: 0, accent: 'blue' },
        { id: 'lantern', recipe: 'lamp', at: [2.6, 1.7], heading: 0 },
        { id: 'exit', recipe: 'lamp', at: [-0.7, 2.45], heading: 0 },
        { id: 'court-stall', recipe: 'stall', at: [-2.5, 5], heading: 1, accent: 'green' },
        { id: 'court-canopy', recipe: 'canopy', at: [-2.5, 5], heading: 1, accent: 'green' },
        { id: 'east-court-stall', recipe: 'stall', at: [2.3, 4.7], heading: 3, accent: 'red' },
        { id: 'east-court-canopy', recipe: 'canopy', at: [2.3, 4.7], heading: 3, accent: 'gold' },
        { id: 'entry-lantern', recipe: 'lamp', at: [1.75, 6.1], heading: 0 },
        { id: 'north-lantern', recipe: 'lamp', at: [0.9, -6.25], heading: 0 },
        { id: 'west-court-shop', recipe: 'marketFacade', at: [-11.5, 3.25], heading: 1, accent: 'blue' },
        { id: 'east-court-shop', recipe: 'marketFacade', at: [12.7, 3.75], heading: 3, accent: 'gold' },
      ],
      spawn: [0, -7.25],
      discoveries: [{ objectId: 'west-stall', at: [-2.5, 1.14] }, { objectId: 'lantern', at: [2.6, 2.48] }],
      ending: { objectId: 'exit', at: [-0.7, 3.23] },
    },
  },
} satisfies Record<string, Example>;

export type ExampleId = keyof typeof examples;
