import { catalogById, SCENE_CATALOG_VERSION } from './catalog';
import { addRouteDressing, composeGrounds, signatureProblems } from './compose-grounds';
import { clauseAround, composeLayout, seedFromPrompt, titleFromPrompt } from './compose-world';
import { extendOutdoorLayout } from './extend-world';
import type { ComposeResult } from './compose-world';
import { groundBounds, promptSchema, toWalkLayout } from './layout-schema';
import type { Interpretation, Term, WorldLayout } from './layout-schema';
import { localIntent, privateScenePlan, sceneCandidates } from './local-scene-plan';
import { parsePrompt } from './parse-prompt';
import { scenePlanProblems, scenePlanSchema } from './scene-template-schema';
import type { ScenePlan } from './scene-template-schema';
import { PARSER_VERSION, promptWorldSchema, WORLD_SCHEMA_VERSION } from './world-schema';
import { plotAnchors } from './plot-schema';
import type { Plot } from './plot-schema';
import { waterfrontWords } from './scene-direction';
import type { SceneDirection } from './scene-direction';
import { reachableCells } from './route';

export function validateScenePlan(prompt: string, input: unknown) {
  const parsed = scenePlanSchema.safeParse(input);
  if (!parsed.success) throw new Error('The planner returned an invalid scene specification.');
  const plan = parsed.data;
  const local = localIntent(prompt);
  const problems = scenePlanProblems(prompt, plan, sceneCandidates(plan.intent));
  if (local && (local.settings.some(family => !plan.intent.settings.includes(family)) ||
      local.exclusions.some(asset => plan.template.groups.some(group => group.asset === asset)))) {
    problems.push('Keep the setting and exclusions from the original description.');
  }
  if (local?.features.some(feature => feature.asset && !plan.intent.exclusions.includes(feature.asset!) &&
        !plan.intent.features.some(item => item.origin === 'requested' &&
      (item.phrase.toLowerCase().includes(feature.phrase.toLowerCase()) || feature.phrase.toLowerCase().includes(item.phrase.toLowerCase())) &&
      item.count >= feature.count && (!feature.color || feature.color === item.color)))) {
    problems.push('Keep the original requested features, counts, and colors.');
  }
  for (const family of plan.intent.settings) {
    const fixtures = plan.template.groups.filter(group => plan.template.zones[group.zone]?.family === family)
      .flatMap(group => Array.from({ length: group.count }, () => ({ recipe: group.asset })));
    problems.push(...signatureProblems(family, fixtures));
  }
  if (problems.length) throw new Error([...new Set(problems)].join(' '));
  return plan;
}

function spanOf(prompt: string, phrase: string, fallback: Term['span']) {
  const start = prompt.toLowerCase().indexOf(phrase.toLowerCase());
  return start < 0 ? fallback : { start, end: start + phrase.length };
}

function interpret(prompt: string, { intent, template }: ScenePlan): Interpretation {
  const { terms: legacyTerms, relations: legacyRelations } = parsePrompt(prompt);
  const first = prompt.search(/[^\p{White_Space}\p{C}]/u);
  const excerpt = clauseAround(prompt, first, first + (prompt.codePointAt(first)! > 0xffff ? 2 : 1));
  const groupByFeature = new Map<number, number>();
  const terms = template.groups.map((group, index): Term => {
    const feature = group.feature === null ? null : intent.features[group.feature];
    const claim = template.coverage.find(item => item.feature === group.feature);
    const text = feature?.phrase ?? catalogById[group.asset].label;
    if (group.feature !== null && !groupByFeature.has(group.feature)) groupByFeature.set(group.feature, index);
    return {
      kind: 'object', recipe: group.asset, zone: null, text: text.slice(0, 40), span: feature ? spanOf(prompt, feature.phrase, excerpt) : excerpt,
      status: claim?.status === 'substituted' ? 'approximated' : 'rendered',
      note: claim?.reason || (!feature ? 'Setting detail' : null), count: group.count, color: feature?.color ?? null,
    };
  });
  const hasFloor = template.zones.some(zone => zone.surface === 'floor');
  const hasExterior = template.zones.some(zone => zone.surface !== 'floor' && zone.role !== 'display');
  const zones = legacyTerms.filter(term => term.zone && term.status !== 'unsupported' &&
    !(intent.settings.includes('water-park') && term.zone === 'water'));
  const offset = terms.length;
  terms.push(...zones.slice(0, 40 - terms.length));
  const relations = intent.relations.flatMap((relation): Interpretation['relations'] => {
    const subject = groupByFeature.get(relation.subject), object = groupByFeature.get(relation.object);
    return [{ kind: relation.kind, span: spanOf(prompt, relation.phrase, excerpt), subject: subject ?? null, object: object ?? null,
      status: subject !== undefined && object !== undefined ? 'applied' : 'unsupported' }];
  });
  for (const old of legacyRelations) {
    if (relations.length >= 20 || relations.some(relation => relation.span.start === old.span.start) || old.subject === null || old.object === null) continue;
    const subjectTerm = legacyTerms[old.subject], objectTerm = legacyTerms[old.object];
    const zone = zones.indexOf(objectTerm);
    const subject = terms.findIndex(term => term.recipe && term.span.start <= subjectTerm.span.start && term.span.end >= subjectTerm.span.end);
    if (zone >= 0 && subject >= 0 && offset + zone < terms.length) relations.push({ ...old, subject, object: offset + zone });
  }
  return { terms, relations, timeOfDay: intent.timeOfDay, weather: intent.weather,
    setting: hasFloor ? hasExterior ? 'mixed' : 'indoor' : 'outdoor' };
}

function realizedRelation(layout: WorldLayout, { kind, subject, object }: Interpretation['relations'][number], terms: Term[]) {
  const a = layout.placements.find(p => p.term === subject);
  const b = layout.placements.find(p => p.term === object);
  if (!a || object === null) return false;
  if (!b) {
    const zone = terms[object]?.zone;
    return (zone === 'water' && kind === 'above' && a.y > 0 && Boolean(layout.water));
  }
  if (kind === 'above') return a.y > b.y + .15 && Math.hypot(a.x - b.x, a.z - b.z) < 1.4;
  if (kind === 'under') return b.recipe === 'bridge' && Math.abs(a.z - b.z) < .75 && Math.abs(a.x - b.x) < 5.5;
  if (kind === 'beyond') return a.z < b.z - .8;
  if (kind === 'front') return a.z > b.z + .8;
  if (kind === 'inside') return Boolean(layout.indoor && [a, b].every(p => p.x >= layout.indoor!.area.minX &&
    p.x <= layout.indoor!.area.maxX && p.z >= layout.indoor!.area.minZ && p.z <= layout.indoor!.area.maxZ));
  return Math.hypot(a.x - b.x, a.z - b.z) < 3.6;
}

export function composeSceneTemplate(prompt: string, { id, plan: input, processing = 'private', plot, direction }: {
  id: string; plan?: unknown; processing?: 'private' | 'gemini'; plot?: Plot; direction?: SceneDirection;
}): ComposeResult {
  const promptResult = promptSchema.safeParse(prompt);
  if (!promptResult.success) return { ok: false, reason: promptResult.error.issues[0].message, interpretation: null };
  const proposed = input ?? privateScenePlan(prompt);
  if (!proposed) return { ok: false,
    reason: 'This place could not be resolved. Try adding a setting or a recognizable object.',
    interpretation: parsePrompt(prompt) };
  let plan: ScenePlan;
  try { plan = validateScenePlan(prompt, proposed); }
  catch (error) { return { ok: false, reason: (error as Error).message, interpretation: null }; }
  const { intent, template } = plan;
  const districts = template.groups.map(group => group.feature === null ? undefined : intent.features[group.feature]?.district);
  const interpretation = interpret(prompt, plan);
  const seed = seedFromPrompt(JSON.stringify([prompt, SCENE_CATALOG_VERSION, template]));
  const profile = template.zones[template.spawn].family;
  const waterfront = Boolean(direction && waterfrontWords.test(prompt));
  const ride = Boolean(plot?.moments.some(moment => moment.actions.some(action => action.kind === 'slide')));
  const fallbackTitle = profile === 'water-park' ? 'Water Park' : profile === 'ballfield' ? 'Baseball Field' : profile[0].toUpperCase() + profile.slice(1);
  let lastProblem = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const composed = intent.settings.length === 1 && (profile === 'ballfield' || profile === 'water-park' || profile === 'park' && !waterfront)
      ? composeGrounds(prompt, template, interpretation, seed, attempt, ride, districts)
      : composeLayout(prompt, interpretation, seed, attempt, {
        ending: template.ending, discoveries: template.discoveries,
        size: template.zones[template.spawn].size,
        surfaces: template.groups.map(group => template.zones[group.zone].surface),
        districts, waterfront,
        wallWindow: Boolean(direction && interpretation.setting === 'indoor'),
      });
    if (typeof composed === 'string') { lastProblem = composed; continue; }
    // Outdoor scenes get open land around the composed core; walkways are then routed from the new spawn.
    const extended = extendOutdoorLayout({ ...composed, geometryVersion: 3, profile, ...(plot && { plot }), ...(direction && { direction }) });
    if (waterfront && extended.water && extended.approaches && plot) {
      const land = groundBounds(extended);
      const shore = extended.water.maxX === extended.bounds.maxX ? land.maxX : land.minX;
      const cells = reachableCells(toWalkLayout(extended)).filter(cell => Math.abs(cell.x - shore) > .95 && Math.abs(cell.x - shore) < 1.9);
      for (const moment of plot.moments.filter(moment => moment.actions.some(action => action.kind === 'sip'))) {
        const index = plotAnchors.indexOf(moment.anchor);
        const target = extended.approaches[index];
        const spot = cells.reduce<(typeof cells)[number] | undefined>((best, cell) =>
          !best || Math.abs(cell.z - target.z) < Math.abs(best.z - target.z) ? cell : best, undefined);
        if (spot) extended.approaches[index] = spot;
      }
    }
    const layout = addRouteDressing(extended);
    if (typeof layout === 'string') { lastProblem = layout; continue; }
    const placed = template.groups.map((_, index) => layout.placements.filter(placement => placement.term === index).length);
    const coverage = template.coverage.map(item => {
      const feature = intent.features[item.feature];
      const count = template.groups.reduce((sum, group, index) => sum + (group.feature === item.feature ? placed[index] : 0), 0);
      return count === 0 ? { ...item, status: 'missing' as const, reason: item.reason || 'No safe placement was available.' }
        : count < feature.count ? { ...item, status: 'substituted' as const, reason: `Placed ${count} of ${feature.count} requested copies.` } : item;
    });
    const terms = interpretation.terms.map((term, index): Term => {
      if (index >= placed.length || placed[index] === term.count) return term;
      return { ...term, status: placed[index] ? 'approximated' : 'unsupported',
        note: placed[index] ? `Placed ${placed[index]} of ${term.count} planned copies.` : 'No safe placement was available.' };
    });
    const relations = interpretation.relations.map(relation => ({ ...relation,
      status: realizedRelation(layout, relation, terms) ? 'applied' as const : 'unsupported' as const }));
    const candidate = promptWorldSchema.safeParse({
      kind: 'prompt-world', id, schemaVersion: WORLD_SCHEMA_VERSION,
      versions: { parser: PARSER_VERSION, layout: 3, catalog: SCENE_CATALOG_VERSION },
      seed, title: titleFromPrompt(prompt, fallbackTitle), prompt,
      interpretation: { ...interpretation, terms, relations }, layout, soundtrack: null,
      scene: { processing, plan, coverage },
    });
    if (candidate.success) return { ok: true, world: candidate.data };
    lastProblem = candidate.error.issues[0].message;
  }
  return { ok: false, reason: `${lastProblem} Try describing a different arrangement of the same place.`, interpretation };
}
