import { z } from 'zod';
import type { WalkLayout } from '../gameplay/layout';
import { getWorldApproach, getWorldWalkableSurfaces } from '../scene/world-recipes';
import { placementSolids, recipeIds, sceneryPlacement } from './recipes';
import { routeProblems } from './route';
import { plotAnchors, plotProblems, plotSchema } from './plot-schema';
import type { PlotMoment } from './plot-schema';
import { sceneDirectionSchema, waterfrontWords } from './scene-direction';
import { slidePoint } from './original-models';

export const PROMPT_MAX = 600;
export const PROMPT_PAYLOAD_MAX = 4096;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
export const promptLength = (text: string) => [...graphemes.segment(text)].length;
export const promptSchema = z.string().max(PROMPT_PAYLOAD_MAX)
  .refine((text) => /[^\p{White_Space}\p{C}]/u.test(text), 'Describe the place to continue.')
  .refine((text) => new TextEncoder().encode(text).length <= PROMPT_PAYLOAD_MAX, 'This description uses too much encoded text.')
  .refine((text) => promptLength(text) <= PROMPT_MAX, `Use up to ${PROMPT_MAX} characters.`);

const coordinate = z.number().min(-50).max(50);
const point = z.strictObject({ x: coordinate, z: coordinate });
const span = z.strictObject({ start: z.int().min(0).max(PROMPT_PAYLOAD_MAX - 1), end: z.int().min(1).max(PROMPT_PAYLOAD_MAX) })
  .refine(({ start, end }) => start < end, 'Span must be nonempty.');
const rgb = z.tuple([z.int().min(0).max(255), z.int().min(0).max(255), z.int().min(0).max(255)]);
export const colorNames = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'black', 'brown', 'grey'] as const;
export const relationKinds = ['beside', 'beyond', 'above', 'under', 'front', 'inside'] as const;

const termSchema = z.strictObject({
  text: z.string().min(1).max(40),
  span,
  /** `zone` terms set the ground, water or indoor area instead of placing a recipe. */
  kind: z.enum(['object', 'zone']),
  recipe: z.enum(recipeIds).nullable(),
  zone: z.enum(['water', 'indoor', 'paved', 'grass']).nullable(),
  status: z.enum(['rendered', 'approximated', 'unsupported']),
  note: z.string().max(120).nullable(),
  count: z.int().min(1).max(8),
  color: z.enum(colorNames).nullable(),
});

export const interpretationSchema = z.strictObject({
  terms: z.array(termSchema).max(40),
  relations: z.array(z.strictObject({
    kind: z.enum(relationKinds),
    span,
    subject: z.int().min(0).max(39).nullable(),
    object: z.int().min(0).max(39).nullable(),
    status: z.enum(['applied', 'unsupported']),
  })).max(20),
  timeOfDay: z.enum(['dawn', 'day', 'dusk', 'night']),
  weather: z.enum(['clear', 'fog', 'rain', 'snow']),
  setting: z.enum(['outdoor', 'indoor', 'mixed']),
});
export type Interpretation = z.infer<typeof interpretationSchema>;
export type Term = Interpretation['terms'][number];

const solid = z.discriminatedUnion('shape', [
  z.strictObject({ shape: z.literal('circle'), x: coordinate, z: coordinate, radius: z.number().min(0.05).max(10) }),
  z.strictObject({ shape: z.literal('box'), x: coordinate, z: coordinate, halfX: z.number().min(0.05).max(30), halfZ: z.number().min(0.05).max(30) }),
]);
const rect = z.strictObject({ minX: coordinate, maxX: coordinate, minZ: coordinate, maxZ: coordinate })
  .refine(({ minX, maxX, minZ, maxZ }) => minX < maxX && minZ < maxZ, 'Empty area.');

const placementSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z-]*-\d{1,2}$/),
  recipe: z.enum(recipeIds),
  x: coordinate,
  z: coordinate,
  /** Height above the ground, used for raised objects such as lanterns above stalls. */
  y: z.number().min(0).max(6),
  rotation: z.number().min(-Math.PI).max(Math.PI),
  scale: z.number().min(0.5).max(2),
  color: rgb.nullable(),
  /** Index into interpretation.terms; null for supporting geometry such as a hill under a lighthouse. */
  term: z.int().min(0).max(39).nullable(),
});
export type Placement = z.infer<typeof placementSchema>;

export const worldLayoutSchema = z.strictObject({
  geometryVersion: z.union([z.literal(2), z.literal(3)]).optional(),
  profile: z.enum(['park', 'water-park', 'coast', 'market', 'interior', 'woodland', 'city', 'rural', 'fantasy', 'station', 'ballfield']).optional(),
  plot: plotSchema.optional(),
  direction: sceneDirectionSchema.optional(),
  drySurfaces: z.array(rect).min(1).max(16).optional(),
  paths: z.array(z.array(point).min(2).max(80)).max(4).optional(),
  approaches: z.tuple([point, point, point]).optional(),
  bounds: rect,
  spawn: point,
  playerRadius: z.number().min(0.1).max(1),
  reach: z.number().min(0.5).max(3),
  water: rect.nullable(),
  indoor: z.strictObject({ area: rect, door: z.strictObject({ x: coordinate, z: coordinate, width: z.number().min(1).max(4) }) }).nullable(),
  placements: z.array(placementSchema).min(1).max(80),
  solids: z.array(solid).max(120),
  discoveries: z.tuple([
    z.strictObject({ placementId: z.string(), excerpt: span }),
    z.strictObject({ placementId: z.string(), excerpt: span }),
  ]),
  landmark: z.strictObject({ placementId: z.string() }),
});
export type WorldLayout = z.infer<typeof worldLayoutSchema>;

export function momentPoint(layout: WorldLayout, moment: PlotMoment) {
  const index = layout.profile === 'ballfield' && moment.actions.some(action => action.object === 'ball')
    ? 2 : plotAnchors.indexOf(moment.anchor);
  return layout.approaches?.[index] ?? layout.spawn;
}

export function placementById(layout: WorldLayout, id: string) {
  const placement = layout.placements.find((p) => p.id === id);
  if (!placement) throw new Error('Unknown placement ' + id);
  return placement;
}

/** Adapter to A's gameplay contract: the controller never sees prompt text. */
export function toWalkLayout(layout: WorldLayout): WalkLayout {
  const geometry = layout.geometryVersion !== undefined;
  const at = (id: string) => {
    const { x, y, z } = placementById(layout, id);
    // A lighthouse on a bluff is approached from the foot of the hill.
    const hill = geometry && y > 0 && layout.placements.find((p) => p.recipe === 'hill' && p.x === x && p.z === z);
    const scenery = hill && sceneryPlacement(hill);
    const approach = scenery && getWorldApproach(scenery);
    return approach ? { x: approach[0], z: approach[1] } : { x, z };
  };
  const surfaces = layout.drySurfaces ?? (geometry && layout.water
    ? [groundBounds(layout), ...layout.placements.flatMap((p) => {
      const scenery = sceneryPlacement(p);
      return scenery && p.y === 0 ? getWorldWalkableSurfaces(scenery) : [];
    })] : undefined);
  return {
    spawn: layout.spawn,
    bounds: layout.bounds,
    solids: geometry ? [...layout.solids, ...layout.placements.flatMap(placementSolids)] : layout.solids,
    walkable: surfaces,
    ...(layout.geometryVersion === 3 && { checkSight: true }),
    artifacts: layout.approaches ? [layout.approaches[0], layout.approaches[1]] : [at(layout.discoveries[0].placementId), at(layout.discoveries[1].placementId)],
    landmark: layout.approaches?.[2] ?? at(layout.landmark.placementId),
    playerRadius: layout.playerRadius,
    reach: layout.reach,
  };
}

export function groundBounds({ bounds, water }: WorldLayout): WorldLayout['bounds'] {
  if (!water) return bounds;
  return water.maxX === bounds.maxX ? { ...bounds, maxX: water.minX } : { ...bounds, minX: water.maxX };
}

export const dayWorldSchema = z.strictObject({
  layout: worldLayoutSchema.required({ geometryVersion: true }),
  interpretation: interpretationSchema,
  scenePrompt: promptSchema.optional(),
});

export function checkWorldLayout(prompt: string, interpretation: Interpretation, layout: WorldLayout, ctx: z.RefinementCtx) {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  if (layout.direction && !layout.plot) issue('Scene direction requires a playable plot.', ['layout', 'direction']);
  if (layout.plot) {
    if (layout.geometryVersion !== 3 || !layout.approaches) issue('A plot needs a resolved scene with reachable anchors.', ['layout', 'plot']);
    for (const message of plotProblems(layout.plot, prompt)) issue(message, ['layout', 'plot']);
    if (layout.direction && waterfrontWords.test(prompt) && !layout.water) {
      issue('A waterfront visit needs a continuous water edge.', ['layout', 'water']);
    }
    if (layout.plot.moments.some(moment => moment.actions.some(action => action.kind === 'slide'))) {
      const slide = layout.placements.find(p => p.recipe === 'tube-slide');
      const pool = layout.placements.find(p => p.recipe === 'pool-basin');
      const [x, , z] = slidePoint(1);
      const exitX = slide && slide.x + (Math.cos(slide.rotation) * x + Math.sin(slide.rotation) * z) * slide.scale;
      const exitZ = slide && slide.z + (-Math.sin(slide.rotation) * x + Math.cos(slide.rotation) * z) * slide.scale;
      if (!pool || exitX === undefined || exitZ === undefined || Math.abs(pool.x - exitX) >= 2.2 || Math.abs(pool.z - exitZ) >= 1.72) {
        issue('The water slide must land within its pool.', ['layout', 'plot']);
      }
    }
  }
  for (const [index, { span: { end } }] of interpretation.terms.entries()) {
    if (end > prompt.length) issue('Term span is outside the prompt.', ['interpretation', 'terms', index]);
  }
  for (const [index, { subject, object }] of interpretation.relations.entries()) {
    if ([subject, object].some((term) => term !== null && term >= interpretation.terms.length)) {
      issue('Relation references a missing term.', ['interpretation', 'relations', index]);
    }
  }
  const ids = new Set(layout.placements.map(({ id }) => id));
  if (ids.size !== layout.placements.length) issue('Placement IDs must be unique.', ['layout', 'placements']);
  if (layout.placements.some(({ term }) => term !== null && term >= interpretation.terms.length)) {
    issue('Placement references a missing term.', ['layout', 'placements']);
  }
  if (layout.geometryVersion === 3) {
    const { minX, maxX, minZ, maxZ } = layout.bounds;
    const within = ({ x, z }: { x: number; z: number }) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    if (!layout.profile || !layout.paths || !layout.approaches ||
      [...layout.placements, ...layout.approaches, ...layout.paths.flat()].some(point => !within(point)) ||
      layout.drySurfaces?.some(rect => !within({ x: rect.minX, z: rect.minZ }) || !within({ x: rect.maxX, z: rect.maxZ }))) {
      issue('The composed scene is missing geometry or contains positions outside its bounds.', ['layout']);
    }
  }
  const [first, second] = layout.discoveries;
  if (first.placementId === second.placementId || [first, second, layout.landmark].some(({ placementId }) => !ids.has(placementId))
      || layout.discoveries.some(({ placementId }) => placementId === layout.landmark.placementId)) {
    issue('Expected two distinct discoveries and a separate landmark.', ['layout', 'discoveries']);
  }
  for (const [index, { excerpt }] of layout.discoveries.entries()) {
    if (excerpt.end > prompt.length || !prompt.slice(excerpt.start, excerpt.end).trim()) {
      issue('Excerpt must reference nonblank prompt text.', ['layout', 'discoveries', index, 'excerpt']);
    }
  }
  if (ctx.issues.length === 0) {
    const marks = layout.plot?.moments.map(moment => momentPoint(layout, moment));
    for (const problem of routeProblems(toWalkLayout(layout), marks)) issue(problem, ['layout']);
  }
}
