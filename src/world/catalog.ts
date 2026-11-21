import { originalModel } from './original-models';
import { recipeIds, recipes } from './recipes';
import type { RecipeId } from './recipes';

export const SCENE_CATALOG_VERSION = 3;
export const sceneFamilies = ['park', 'water-park', 'coast', 'market', 'interior', 'woodland', 'city', 'rural', 'fantasy', 'station'] as const;
export type SceneFamily = typeof sceneFamilies[number];
export const surfaces = ['grass', 'deck', 'pool', 'sand', 'water', 'paved', 'floor', 'rock'] as const;
export type Surface = typeof surfaces[number];

const legacyAliases: Partial<Record<RecipeId, string[]>> = {
  tree: ['oak', 'broadleaf tree', 'дерево', 'деревья'], bench: ['seat', 'скамейка', 'скамейки'],
  flower: ['flowers', 'цветы'], boat: ['rowboat', 'лодка'], bridge: ['railway bridge', 'мост'],
  stall: ['stall', 'market stall', 'booth'], lamp: ['street lamp', 'streetlight'], pier: ['dock'],
  lighthouse: ['маяк'], table: ['стол'],
};

export const catalog = recipeIds.map(id => {
  const original = originalModel(id);
  const { label, role, radius, maxCount } = recipes[id];
  const aliases = [...new Set([id.replaceAll('-', ' '), label.toLowerCase(), ...(legacyAliases[id] ?? []), ...(original?.aliases ?? [])])];
  const support: readonly Surface[] = id === 'pool-basin' ? ['pool']
    : id === 'boat' ? ['water'] : id === 'pier' ? ['sand', 'water']
    : original?.family === 'interior' ? ['floor', 'paved', 'deck', 'grass']
    : recipeSupports(id);
  return { id, label, aliases, family: original?.family ?? 'legacy', role, radius, maxCount, support,
    license: 'Original project geometry', revision: 1, scale: [0.5, 2] as const,
    discoverable: !['gate', 'hill', 'bridge', 'canopy', 'deck', 'boardwalk', 'airlock', 'doorway', 'entry-arch', 'park-gate'].includes(id) };
});

function recipeSupports(id: RecipeId): readonly Surface[] {
  if (['tube-slide', 'open-flume', 'slide-tower', 'splash-pad', 'lazy-river'].includes(id)) return ['deck', 'paved', 'grass'];
  return ['grass', 'deck', 'sand', 'paved', 'floor', 'rock'];
}

export const catalogById = Object.fromEntries(catalog.map(entry => [entry.id, entry])) as Record<RecipeId, typeof catalog[number]>;

export const familySurfaces: Record<SceneFamily, Surface> = {
  park: 'grass', 'water-park': 'deck', coast: 'sand', market: 'paved', interior: 'floor',
  woodland: 'grass', city: 'paved', rural: 'grass', fantasy: 'rock', station: 'floor',
};

export const familyDefaults: Record<SceneFamily, ReadonlyArray<readonly [RecipeId, number]>> = {
  park: [['gazebo', 1], ['bench', 2], ['flower-bed', 3], ['tree', 4], ['pine', 3], ['park-gate', 1], ['planter', 2], ['trail-sign', 1]],
  'water-park': [['cabana', 1], ['pool-basin', 1], ['tube-slide', 1], ['splash-pad', 1], ['lifeguard-chair', 1],
    ['entry-arch', 1], ['life-ring', 1], ['shade-umbrella', 2], ['palm', 4], ['pool-ladder', 1]],
  coast: [['lighthouse', 1], ['pier', 1], ['boat', 1], ['lantern', 2], ['rock', 4], ['reeds', 3]],
  market: [['stall', 3], ['canopy', 3], ['lantern', 2], ['crate', 2], ['market-cart', 1], ['lamp', 2]],
  interior: [['table', 1], ['cupboard', 1], ['chair', 2], ['window', 1], ['floor-lamp', 1], ['rug', 1]],
  woodland: [['cabin', 1], ['pine', 4], ['birch', 3], ['fern', 3], ['stump', 1], ['mushroom', 3]],
  city: [['station-facade', 1], ['storefront', 2], ['bus-stop', 1], ['lamp', 3], ['mailbox', 1], ['apartment', 3]],
  rural: [['barn', 1], ['windmill', 1], ['haystack', 3], ['well', 1], ['fence', 3]],
  fantasy: [['ruin', 1], ['crystal', 4], ['standing-stone', 2], ['rock', 3], ['lantern-shrine', 1]],
  station: [['station-module', 1], ['control-panel', 1], ['airlock', 1], ['porthole', 1], ['rover', 1]],
};

function normalize(value: string) {
  return value.normalize('NFKC').trim().toLowerCase();
}

export function retrieveCandidates(features: { phrase: string; asset: RecipeId | null }[], families: SceneFamily[]) {
  const matches = features.map(({ phrase, asset }) => {
    const word = normalize(phrase);
    return catalog.filter(entry => entry.id === asset || entry.aliases.includes(word))
      .sort((a, b) => Number(b.id === asset) - Number(a.id === asset)).slice(0, 4).map(({ id }) => id);
  });
  return [...new Set([...matches.flatMap(ids => ids.slice(0, 1)),
    ...families.flatMap(family => familyDefaults[family].map(([id]) => id)), ...matches.flat(),
    'open-flume', 'doorway', 'trail-sign', 'fern', 'deck', 'life-ring'] as RecipeId[])].slice(0, 48);
}
