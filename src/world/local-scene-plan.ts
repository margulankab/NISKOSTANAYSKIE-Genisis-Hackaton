import { catalog, catalogById, familyDefaults, familySurfaces, retrieveCandidates, SCENE_CATALOG_VERSION } from './catalog';
import type { SceneFamily, Surface } from './catalog';
import { parsePrompt } from './parse-prompt';
import type { RecipeId } from './recipes';
import type { ScenePlan, SceneTemplate } from './scene-template-schema';
import type { WorldIntent } from './world-intent-schema';

const settingPatterns: [SceneFamily, RegExp][] = [
  ['water-park', /\bwater[\s-]*park\b|аквапарк/giu],
  ['station', /\b(?:lunar station|space station|spacecraft|sci-fi interior)\b|лунная станция/giu],
  ['coast', /\b(?:cove|coast|beach|shore|bay|harbou?r|sea|pier)\b|побережье|бухта|пляж/giu],
  ['market', /\b(?:market|bazaar|night fair)\b|рынок/giu],
  ['interior', /\b(?:kitchen|room|hallway|library|bedroom|café|cafe|greenhouse|coffee shop)\b|кухня|комната|кафе/giu],
  ['woodland', /\b(?:forest|woodland|woods|grove)\b|лес/giu],
  ['city', /\b(?:city|neighbou?rhood|historical street|street|plaza|town|alley|train station)\b|город|улица/giu],
  ['rural', /\b(?:farm|barn|windmill|countryside|village|field)\b|деревня|ферма/giu],
  ['fantasy', /\b(?:cavern|cave|ruins?|castle|crystal|grotto|fantasy)\b|пещера/giu],
  ['park', /\b(?:park|garden|courtyard|playground)\b|парк|сад/giu],
];
const negation = /(?:^|[^\p{L}])(?:no|without|exclude|omit|без|нет|никаких)\s+(?:(?:any|a|the|[\p{L}]+)\s+){0,2}$/iu;
const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, два: 2, две: 2, три: 3 };
const normalize = (text: string) => text.toLowerCase().replaceAll('-', ' ');
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byLongest = (a: { phrase: string }, b: { phrase: string }) => b.phrase.length - a.phrase.length;
const aliasPattern = catalog.flatMap(({ id, aliases }) => aliases.map(phrase => ({ id, phrase })))
  .filter(({ phrase }) => phrase !== 'memory stone' && phrase !== 'marker')
  .sort(byLongest);
const aliasLookup = new Map(aliasPattern.slice().reverse().map(({ id, phrase }) => [normalize(phrase), id]));
const aliasMatcher = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...new Set(aliasPattern.map(({ phrase }) => escape(phrase).replaceAll(' ', '[\\s-]+')))].join('|')})(?:s|es)?(?![\\p{L}\\p{N}])`, 'giu');

export function localIntent(prompt: string): WorldIntent | null {
  const parsed = parsePrompt(prompt);
  const settingsFound = settingPatterns.flatMap(([family, pattern]) =>
    [...prompt.matchAll(pattern)].map(match => ({ family, phrase: match[0], start: match.index })))
    .sort((a, b) => a.start - b.start || byLongest(a, b))
    .filter((match, i, all) => !negation.test(prompt.slice(0, match.start))
      && !all.slice(0, i).some(other => match.start >= other.start && match.start < other.start + other.phrase.length));
  // A greenhouse qualifies an explicitly named station. Its garden remains a separate outdoor zone.
  const station = settingsFound.some(hit => hit.family === 'station');
  const settingHits = settingsFound.map(hit => station && /^greenhouse$/i.test(hit.phrase) ? { ...hit, family: 'station' as const } : hit);
  const settings = [...new Set(settingHits.map(hit => hit.family))].slice(0, 3);
  const features: WorldIntent['features'] = [];
  const spans: { start: number; end: number }[] = [];
  const exclusions = new Set<RecipeId>();
  const candidates = [...prompt.matchAll(aliasMatcher)].flatMap(match => {
    const phrase = normalize(match[0]).replace(/\s+/g, ' ');
    const asset = aliasLookup.get(phrase) ?? aliasLookup.get(phrase.replace(/s$/, '')) ?? aliasLookup.get(phrase.replace(/es$/, ''));
    if (!asset) return [];
    return [{ asset, phrase: match[0], start: match.index, end: match.index + match[0].length }];
  });
  for (const term of parsed.terms) {
    if (term.kind !== 'object' || candidates.some(candidate => candidate.start < term.span.end && candidate.end > term.span.start)
      || settingHits.some(hit => term.span.start >= hit.start && term.span.start < hit.start + hit.phrase.length)) continue;
    if (term.recipe || !/^(?:opened|stood|waited|met|was|were|stayed|sat|walked|returned)$/i.test(term.text)) {
      candidates.push({ asset: term.recipe as RecipeId, phrase: term.text, ...term.span });
    }
  }
  if (!settings.length) {
    const eligible = candidates.find(({ asset, start }) => asset && !negation.test(prompt.slice(0, start)));
    if (!eligible) return null;
    const family = catalogById[eligible.asset].family;
    settings.push(family === 'interior' ? 'interior' : family === 'fantasy' ? 'fantasy' : family === 'coastal' ? 'rural'
      : family === 'recreation' ? 'water-park' : family === 'urban' ? 'city' : eligible.asset === 'lighthouse' || eligible.asset === 'boat' ? 'coast' : 'park');
  }
  for (const { asset, phrase, start, end } of candidates.sort((a, b) => a.start - b.start)) {
    const before = prompt.slice(0, start);
    if (negation.test(before)) { if (asset) exclusions.add(asset); continue; }
    if (features.length >= 24) continue;
    // "the pier" refers to the first pier already named.
    const repeated = asset && /\bthe\s*$/i.test(before) && features.findIndex(feature => feature.asset === asset);
    if (typeof repeated === 'number' && repeated >= 0) continue;
    const sameClause = settingHits.filter(hit => settings.includes(hit.family) &&
      !/[.!?;,]/.test(prompt.slice(Math.min(start, hit.start), Math.max(end, hit.start))));
    const nearest = sameClause.filter(hit => hit.start <= start).at(-1) ?? sameClause[0]
      ?? settingHits.filter(hit => hit.start <= start && settings.includes(hit.family)).at(-1);
    const context = parsed.terms.find(term => term.span.start >= start && term.span.end <= end);
    const prefix = before.match(/(?:^|[^\p{L}\p{N}])([\p{L}\p{N}]+)(?:\s+(?:red|yellow|blue|green|white|pink|orange))?\s+$/iu)?.[1].toLowerCase();
    const explicitCount = prefix && (numberWords[prefix] ?? (/^\d+$/.test(prefix) ? Number(prefix) : 0));
    const count = Math.max(1, Math.min(8, explicitCount || (context?.recipe === asset ? context.count : 1)));
    const setting = asset === 'fern' && /^\s+(?:garden|forest)/i.test(prompt.slice(end)) ? settings.find(family => family === 'park' || family === 'woodland')
      : asset === 'pool-basin' || asset === 'tube-slide' || asset === 'splash-pad' ? settings.find(family => family === 'water-park')
      : asset === 'airlock' || asset === 'station-module' || asset === 'dome' ? settings.find(family => family === 'station') : nearest?.family;
    spans.push({ start, end });
    const levitating = asset !== 'floating-slab' ? before.match(/\b(?:levitating|floating)\s*$/i) : null;
    features.push({ phrase: levitating ? prompt.slice(levitating.index, end) : phrase,
      asset: levitating ? null : asset ?? null, setting: setting ?? settings[0], count, color: context?.color ?? null, origin: 'requested' });
  }
  const relations: WorldIntent['relations'] = [];
  for (const relation of parsed.relations) {
    const subject = spans.map(({ end }, index) => ({ end, index })).filter(({ end }) =>
      end <= relation.span.start && !/[.!?]/.test(prompt.slice(end, relation.span.start))).at(-1)?.index ?? -1;
    const object = spans.findIndex(({ start }) => start >= relation.span.end && !/[.!?]/.test(prompt.slice(relation.span.end, start)));
    if (subject >= 0 && object >= 0 && subject !== object) relations.push({ phrase: prompt.slice(relation.span.start, relation.span.end), kind: relation.kind, subject, object });
  }
  return { settings, features, relations, exclusions: [...exclusions], timeOfDay: parsed.timeOfDay, weather: parsed.weather,
    mood: /\b(?:joyful|happy|playful)\b/i.test(prompt) || settings[0] === 'water-park' ? 'joyful'
      : /\b(?:tense|anxious|eerie)\b/i.test(prompt) ? 'tense'
      : parsed.timeOfDay === 'night' ? 'subdued' : /\b(?:quiet|calm|peaceful)\b/i.test(prompt) ? 'calm' : 'nostalgic' };
}

export function privateScenePlan(prompt: string): ScenePlan | null {
  const intent = localIntent(prompt);
  if (!intent) return null;
  const { settings, exclusions, features } = intent;
  const zones: SceneTemplate['zones'] = settings.map((family, index) => ({
    family, surface: familySurfaces[family], role: index === 0 ? 'entry' : 'destination', size: settings.length > 1 ? 'medium' : 'large',
  }));
  const zoneFor = (family: SceneFamily, asset: RecipeId) => {
    const surface: Surface = asset === 'pool-basin' ? 'pool' : asset === 'boat' || asset === 'pier' ? 'water'
      : family === 'water-park' && ['tube-slide', 'open-flume', 'splash-pad'].includes(asset) ? 'deck' : familySurfaces[family];
    const role = surface === 'pool' || surface === 'water' ? 'display'
      : family === 'water-park' && ['tube-slide', 'open-flume', 'splash-pad'].includes(asset) ? 'destination' : null;
    const existing = zones.findIndex(zone => zone.surface === surface && zone.family === family && (!role || role === zone.role));
    if (existing >= 0) return existing;
    zones.push({ family, surface, role: role ?? 'destination', size: 'medium' });
    return zones.length - 1;
  };
  const groups: SceneTemplate['groups'] = [];
  const coverage: SceneTemplate['coverage'] = [];
  const add = (asset: RecipeId, family: SceneFamily, count: number, feature: number | null) => {
    if (exclusions.includes(asset) || groups.length >= 32 || groups.reduce((sum, group) => sum + group.count, count) > 80) return false;
    const zone = zoneFor(family, asset);
    if (!catalogById[asset].support.includes(zones[zone].surface)) return false;
    groups.push({ asset, zone, count, feature, purpose: 'context' });
    return true;
  };
  for (const [index, feature] of features.entries()) {
    const { asset, setting, count } = feature;
    if (!asset || !add(asset, setting, Math.min(count, catalogById[asset].maxCount), index)) {
      coverage.push({ feature: index, status: 'missing', reason: asset && exclusions.includes(asset) ? 'Excluded in the description.' : 'No compatible model or free catalog slot.' });
      continue;
    }
    coverage.push(count > catalogById[asset].maxCount
      ? { feature: index, status: 'substituted', reason: `This model supports up to ${catalogById[asset].maxCount} copies.` }
      : { feature: index, status: 'placed', reason: '' });
  }
  for (const family of settings) for (const [asset, count] of familyDefaults[family]) {
    const existing = groups.filter(group => group.asset === asset && zones[group.zone].family === family);
    if (existing.length) {
      const placed = existing.reduce((sum, group) => sum + group.count, 0);
      if (family === 'park' && asset === 'bench' && placed < 2) add(asset, family, 2 - placed, null);
      continue;
    }
    add(asset, family, count, null);
  }
  const enclosed = settings.find(family => familySurfaces[family] === 'floor');
  if (enclosed && settings.some(family => familySurfaces[family] !== 'floor') && enclosed !== 'station') {
    if (!groups.some(group => group.asset === 'doorway')) add('doorway', enclosed, 1, null);
  }
  if (settings.includes('water-park') && !groups.some(group => group.asset === 'splash-pad')
      && groups.filter(group => group.asset === 'tube-slide' || group.asset === 'open-flume').reduce((sum, group) => sum + group.count, 0) < 2) {
    add('open-flume', 'water-park', 1, null);
  }
  const endingOrder: RecipeId[] = ['cabana', 'gazebo', 'lighthouse', 'dome', 'station-module', 'cabin', 'cavern', 'ruin', 'barn', 'station-facade', 'stall', 'window'];
  const ending = endingOrder.map(asset => groups.findIndex(group => group.asset === asset && zones[group.zone].role !== 'display'))
    .find(index => index >= 0) ?? groups.findIndex(group => catalogById[group.asset].role === 'structure' && zones[group.zone].role !== 'display');
  const priorities: RecipeId[] = settings[0] === 'water-park' ? ['life-ring', 'lifeguard-chair']
    : settings[0] === 'park' ? ['bench', 'flower-bed'] : ['boat', 'control-panel', 'fern'];
  const discoverable = groups.map((group, index) => ({ group, index })).filter(({ group, index }) =>
    index !== ending && catalogById[group.asset].discoverable && (zones[group.zone].role !== 'display' ||
      group.asset === 'boat' && groups.some(other => other.asset === 'pier')));
  const discoveries = discoverable.sort((a, b) => {
    const rank = (group: typeof a.group) => (group.feature !== null ? 8 : 0) + (priorities.includes(group.asset) ? 5 - priorities.indexOf(group.asset) : 0);
    return rank(b.group) - rank(a.group);
  }).slice(0, 2).map(({ index }) => index);
  if (ending < 0 || discoveries.length < 2) return null;
  groups[ending].purpose = 'landmark';
  for (const index of discoveries) groups[index].purpose = 'discovery';
  const connections: SceneTemplate['connections'] = zones.flatMap((zone, index) => index === 0 ? [] : [{
    from: 0, to: index,
    kind: zone.family === 'station' || zones[0].family === 'station' ? 'airlock'
      : zone.surface === 'floor' || zones[0].surface === 'floor' ? 'door' : zone.surface === 'water' ? 'boardwalk' : 'path',
  }]);
  return { intent, template: { version: 1, catalogVersion: SCENE_CATALOG_VERSION, spawn: 0, zones, connections, groups,
    discoveries: [discoveries[0], discoveries[1]], ending, coverage } };
}

export function sceneCandidates(intent: WorldIntent) {
  return retrieveCandidates(intent.features, intent.settings);
}
