import { z } from 'zod';
import { catalogById, SCENE_CATALOG_VERSION, sceneFamilies, surfaces } from './catalog';
import { worldIntentSchema, assetSchema } from './world-intent-schema';
import type { RecipeId } from './recipes';

const index = z.int().min(0).max(31);
export const sceneTemplateSchema = z.strictObject({
  version: z.literal(1),
  catalogVersion: z.literal(SCENE_CATALOG_VERSION),
  zones: z.array(z.strictObject({
    family: z.enum(sceneFamilies),
    surface: z.enum(surfaces),
    role: z.enum(['entry', 'destination', 'display', 'transition']),
    size: z.enum(['small', 'medium', 'large']),
  })).min(1).max(8),
  connections: z.array(z.strictObject({
    from: index, to: index, kind: z.enum(['path', 'entrance', 'door', 'boardwalk', 'bridge', 'airlock']),
  })).max(12),
  groups: z.array(z.strictObject({
    asset: assetSchema, zone: index, count: z.int().min(1).max(8),
    feature: z.int().min(0).max(23).nullable(),
    purpose: z.enum(['landmark', 'discovery', 'context', 'dressing']),
  })).min(3).max(32),
  spawn: index,
  discoveries: z.tuple([index, index]),
  ending: index,
  coverage: z.array(z.strictObject({
    feature: z.int().min(0).max(23),
    status: z.enum(['placed', 'substituted', 'missing']),
    reason: z.string().max(120),
  })).max(24),
});
export const scenePlanSchema = z.strictObject({ intent: worldIntentSchema, template: sceneTemplateSchema });
export type ScenePlan = z.infer<typeof scenePlanSchema>;
export type SceneTemplate = ScenePlan['template'];

export function scenePlanProblems(prompt: string, { intent, template }: ScenePlan, candidates: readonly RecipeId[]) {
  const issues: string[] = [];
  const { zones, connections, groups, spawn, discoveries, ending, coverage } = template;
  const contains = (phrase: string) => prompt.toLowerCase().includes(phrase.toLowerCase());
  if (new Set(intent.settings).size !== intent.settings.length) issues.push('List each setting once.');
  const reachable = new Set([spawn]);
  for (let i = 0; i < zones.length; i++) for (const { from, to } of connections) {
    if (reachable.has(from)) reachable.add(to);
    if (reachable.has(to)) reachable.add(from);
  }
  if (!zones[spawn] || ['pool', 'water'].includes(zones[spawn]?.surface) ||
      connections.some(({ from, to }) => !zones[from] || !zones[to] || from === to) ||
      zones.some((zone, i) => !intent.settings.includes(zone.family) || zone.role !== 'display' && !reachable.has(i)) ||
      intent.settings.some(family => !zones.some(zone => zone.family === family))) issues.push('The scene zones must connect to a dry spawn.');
  if (new Set([...discoveries, ending]).size !== 3 || discoveries.some(i =>
    !groups[i] || groups[i].purpose !== 'discovery' || !catalogById[groups[i].asset].discoverable || !reachable.has(groups[i].zone)) ||
    groups[ending]?.purpose !== 'landmark' || !reachable.has(groups[ending]?.zone)) issues.push('Choose two distinct discoveries and a reachable landmark.');
  if (groups.some(group => {
    const zone = zones[group.zone];
    const asset = catalogById[group.asset];
    return !zone || !candidates.includes(group.asset) || !asset.support.includes(zone.surface)
      || intent.exclusions.includes(group.asset) || group.count > asset.maxCount
      || group.feature !== null && (!intent.features[group.feature] || intent.features[group.feature].setting !== zone.family);
  })) issues.push('An asset, support, feature reference, or count is invalid.');
  if (groups.reduce((total, group) => total + group.count, 0) > 80) issues.push('Use at most 80 placed copies.');
  if (intent.features.some(feature => !intent.settings.includes(feature.setting) ||
    feature.origin === 'requested' && !contains(feature.phrase)) || intent.relations.some(relation =>
    relation.subject === relation.object || !intent.features[relation.subject] || !intent.features[relation.object] ||
    !contains(relation.phrase))) issues.push('Source evidence must match the original prompt.');
  if (new Set(coverage.map(item => item.feature)).size !== coverage.length || coverage.some(item => !intent.features[item.feature])) {
    issues.push('Coverage must reference unique features.');
  }
  for (const [index, feature] of intent.features.entries()) {
    const matches = groups.filter(group => group.feature === index);
    const claim = coverage.find(item => item.feature === index);
    const exact = matches.length > 0 && matches.every(group => group.asset === feature.asset)
      && matches.reduce((total, group) => total + group.count, 0) >= feature.count;
    if ((feature.origin === 'requested' || matches.length) && (!claim ||
      claim.status === 'placed' && !exact || claim.status === 'missing' && matches.length ||
      claim.status === 'substituted' && (!matches.length || !claim.reason.trim()) ||
      claim.status === 'missing' && !claim.reason.trim())) issues.push('Each requested feature needs accurate coverage.');
  }
  return [...new Set(issues)];
}
