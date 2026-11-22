import { z } from 'zod';
import { memoryTitleSchema } from '../shared/memory-schema';
import { RECIPE_CATALOG_VERSION } from './recipes';
import { originalModel } from './original-models';
import { checkWorldLayout, interpretationSchema, promptSchema, worldLayoutSchema } from './layout-schema';
import { memoryStorySchema } from './memory-story-schema';
import { scenePlanProblems, scenePlanSchema, sceneTemplateSchema } from './scene-template-schema';
import { sceneCandidates } from './local-scene-plan';
import { songSchema } from '../music/song';

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
    layout: z.union([z.literal(1), z.literal(LAYOUT_VERSION), z.literal(3)]),
    catalog: z.union([z.literal(1), z.literal(RECIPE_CATALOG_VERSION), z.literal(3)]),
  }),
  seed: z.int().min(0).max(0xffffffff),
  title: memoryTitleSchema,
  prompt: promptSchema,
  interpretation: interpretationSchema,
  layout: worldLayoutSchema,
  soundtrack: soundtrackSchema.nullable(),
  story: memoryStorySchema.optional(),
  /** The player's song of the day: a music-app link and/or description. Optional, so older saves stay valid. */
  song: songSchema.optional(),
  scene: z.strictObject({ processing: z.enum(['private', 'gemini']), plan: scenePlanSchema, coverage: sceneTemplateSchema.shape.coverage }).optional(),
}).superRefine(({ prompt, interpretation, layout, versions, scene, story }, ctx) => {
  if ((layout.geometryVersion ?? 1) !== versions.layout || versions.layout !== versions.catalog
      || (versions.layout === 3) !== Boolean(scene)
      || (versions.layout < 3 && layout.placements.some(placement => originalModel(placement.recipe)))
      || (versions.layout === 1 && layout.placements.some((placement) => placement.recipe === 'canopy'))) {
    ctx.addIssue({ code: 'custom', path: ['versions'], message: 'The world layout and recipe versions do not match.' });
  }
  if (layout.plot && (scene?.processing !== 'gemini' || story)) {
    ctx.addIssue({ code: 'custom', path: ['layout', 'plot'], message: 'A playable plot requires a Gemini scene and a single story format.' });
  }
  if (scene) {
    const { intent, template } = scene.plan;
    const counts = new Map<number, number>();
    const valid = layout.placements.every(placement => {
      const index = placement.term;
      if (index === null) return ['hill'].includes(placement.recipe) && !intent.exclusions.includes(placement.recipe);
      counts.set(index, (counts.get(index) ?? 0) + 1);
      return template.groups[index]?.asset === placement.recipe && !intent.exclusions.includes(placement.recipe);
    });
    const anchors = [...layout.discoveries.map(discovery => discovery.placementId), layout.landmark.placementId];
    if (!valid || layout.profile !== template.zones[template.spawn]?.family ||
        template.groups.some((group, index) => (counts.get(index) ?? 0) > group.count) ||
        [template.discoveries[0], template.discoveries[1], template.ending].some((term, index) =>
          layout.placements.find(placement => placement.id === anchors[index])?.term !== term)) {
      ctx.addIssue({ code: 'custom', path: ['scene'], message: 'Saved placements do not match the accepted scene plan.' });
    }
    for (const message of scenePlanProblems(prompt, scene.plan, sceneCandidates(intent))) {
      ctx.addIssue({ code: 'custom', path: ['scene'], message });
    }
  }
  checkWorldLayout(prompt, interpretation, layout, ctx);
});
export type PromptWorld = z.infer<typeof promptWorldSchema>;

/** Identifies the exact layout a checkpoint belongs to. */
export function layoutKey({ id, versions, seed }: Pick<PromptWorld, 'id' | 'versions' | 'seed'>) {
  return `${id}:${versions.layout}:${versions.catalog}:${seed}`;
}
