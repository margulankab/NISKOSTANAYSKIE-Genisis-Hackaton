import { z } from 'zod';
import { memoryTitleSchema } from '../shared/memory-schema';
import { RECIPE_CATALOG_VERSION } from './recipes';
import { checkWorldLayout, interpretationSchema, promptSchema, worldLayoutSchema } from './layout-schema';
import { memoryStorySchema } from './memory-story-schema';

export { colorNames, relationKinds, PROMPT_MAX, promptSchema, placementById, toWalkLayout } from './layout-schema';
export type { Interpretation, Placement, Term, WorldLayout } from './layout-schema';

/** Versions recorded with every world. Reopening uses the saved layout and never re-parses the prompt. */
export const WORLD_SCHEMA_VERSION = 2;
export const PARSER_VERSION = 1;
export const LAYOUT_VERSION = 2;

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
    layout: z.union([z.literal(1), z.literal(LAYOUT_VERSION)]),
    catalog: z.union([z.literal(1), z.literal(RECIPE_CATALOG_VERSION)]),
  }),
  seed: z.int().min(0).max(0xffffffff),
  title: memoryTitleSchema,
  prompt: promptSchema,
  interpretation: interpretationSchema,
  layout: worldLayoutSchema,
  soundtrack: soundtrackSchema.nullable(),
  story: memoryStorySchema.optional(),
}).superRefine(({ prompt, interpretation, layout, versions }, ctx) => {
  if ((layout.geometryVersion ?? 1) !== versions.layout || versions.layout !== versions.catalog
      || (versions.layout === 1 && layout.placements.some((placement) => placement.recipe === 'canopy'))) {
    ctx.addIssue({ code: 'custom', path: ['versions'], message: 'The world layout and recipe versions do not match.' });
  }
  checkWorldLayout(prompt, interpretation, layout, ctx);
});
export type PromptWorld = z.infer<typeof promptWorldSchema>;

/** Identifies the exact layout a checkpoint belongs to. */
export function layoutKey({ id, versions, seed }: Pick<PromptWorld, 'id' | 'versions' | 'seed'>) {
  return `${id}:${versions.layout}:${versions.catalog}:${seed}`;
}
