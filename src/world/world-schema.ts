import { z } from 'zod';
import { memoryTitleSchema } from '../shared/memory-schema';
import type { WalkLayout } from '../gameplay/layout';
import { RECIPE_CATALOG_VERSION, recipeIds } from './recipes';
import { routeProblems } from './route';

/** Versions recorded with every world. Reopening uses the saved layout and never re-parses the prompt. */
export const WORLD_SCHEMA_VERSION = 2;
export const PARSER_VERSION = 1;
export const LAYOUT_VERSION = 1;

export const PROMPT_MAX = 600;
export const promptSchema = z.string().max(PROMPT_MAX, `Keep the prompt under ${PROMPT_MAX} characters.`)
  .refine((text) => text.trim().length >= 10, 'Describe the place in at least 10 characters.');

const coordinate = z.number().min(-50).max(50);
const point = z.strictObject({ x: coordinate, z: coordinate });
const span = z.strictObject({ start: z.int().min(0).max(PROMPT_MAX - 1), end: z.int().min(1).max(PROMPT_MAX) })
  .refine(({ start, end }) => start < end, 'Span must be nonempty.');
const rgb = z.tuple([z.int().min(0).max(255), z.int().min(0).max(255), z.int().min(0).max(255)]);
export const colorNames = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'black', 'brown', 'grey'] as const;
export const relationKinds = ['beside', 'beyond', 'above', 'under', 'front'] as const;

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
  id: z.string().regex(/^[a-z]+-\d{1,2}$/),
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

const soundtrackSchema = z.strictObject({
  /** Filled by C's catalog selection (MW-018); null while no cleared track is chosen. */
  trackId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  catalogVersion: z.int().min(1),
  title: z.string().min(1).max(120),
  attribution: z.string().min(1).max(300),
  license: z.string().min(1).max(120),
  selection: z.enum(['automatic', 'player']),
});

export const promptWorldSchema = z.strictObject({
  kind: z.literal('prompt-world'),
  id: z.uuid(),
  schemaVersion: z.literal(WORLD_SCHEMA_VERSION),
  versions: z.strictObject({
    parser: z.literal(PARSER_VERSION),
    layout: z.literal(LAYOUT_VERSION),
    catalog: z.literal(RECIPE_CATALOG_VERSION),
  }),
  seed: z.int().min(0).max(0xffffffff),
  title: memoryTitleSchema,
  prompt: promptSchema,
  interpretation: interpretationSchema,
  layout: worldLayoutSchema,
  soundtrack: soundtrackSchema.nullable(),
}).superRefine(({ prompt, interpretation, layout }, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
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
    for (const problem of routeProblems(toWalkLayout(layout))) issue(problem, ['layout']);
  }
});
export type PromptWorld = z.infer<typeof promptWorldSchema>;

export function placementById(layout: WorldLayout, id: string) {
  const placement = layout.placements.find((p) => p.id === id);
  if (!placement) throw new Error('Unknown placement ' + id);
  return placement;
}

/** Adapter to A's gameplay contract: the controller never sees prompt text. */
export function toWalkLayout(layout: WorldLayout): WalkLayout {
  const at = (id: string) => {
    const { x, z } = placementById(layout, id);
    return { x, z };
  };
  return {
    spawn: layout.spawn,
    bounds: layout.bounds,
    solids: layout.solids,
    artifacts: [at(layout.discoveries[0].placementId), at(layout.discoveries[1].placementId)],
    landmark: at(layout.landmark.placementId),
    playerRadius: layout.playerRadius,
    reach: layout.reach,
  };
}

/** Identifies the exact layout a checkpoint belongs to. */
export function layoutKey({ id, versions, seed }: Pick<PromptWorld, 'id' | 'versions' | 'seed'>) {
  return `${id}:${versions.layout}:${versions.catalog}:${seed}`;
}
