import { z } from 'zod';
import { blocked } from '../gameplay/controller';
import { createWalkLayout } from '../gameplay/layout';
import { getSceneStyle } from '../scene/scene-style';
import type { DayBundle } from '../shared/memory-schema';
import type { Point, WalkLayout } from '../gameplay/layout';
import { layoutKey, toWalkLayout } from './world-schema';
import type { PromptWorld } from './world-schema';
import { storyStepSchema } from './memory-story-schema';
import type { StoryStep } from './memory-story-schema';

export const CHECKPOINT_VERSION = 1;

/** Restorable gameplay state, kept in this browser only and keyed by world ID. */
export const checkpointSchema = z.strictObject({
  schemaVersion: z.literal(CHECKPOINT_VERSION),
  worldId: z.uuid(),
  layoutKey: z.string().min(1).max(200),
  savedAt: z.iso.datetime(),
  position: z.strictObject({ x: z.number().min(-50).max(50), z: z.number().min(-50).max(50) }),
  revealed: z.array(z.string().max(40)).max(2),
  ended: z.boolean(),
  storyStep: storyStepSchema.optional(),
});
export type Checkpoint = z.infer<typeof checkpointSchema>;

export interface GameState { position: Point; revealed: ReadonlySet<string>; ended: boolean; storyStep?: StoryStep }

type CheckpointTarget = {
  id: string;
  key: string;
  walk: WalkLayout;
  discoveries: readonly string[];
  hasStory?: boolean;
};

export function dayCheckpointTarget({ manifest, world }: Pick<DayBundle, 'manifest' | 'world'>): CheckpointTarget {
  return {
    id: manifest.id,
    key: `day:${manifest.id}:${manifest.rulesVersion}:${world?.layout.geometryVersion ?? 1}:${manifest.seed}`,
    walk: world ? toWalkLayout(world.layout) : createWalkLayout(getSceneStyle(manifest)),
    discoveries: manifest.artifacts.map(({ id }) => id),
  };
}

function target(source: PromptWorld | CheckpointTarget): CheckpointTarget {
  if ('walk' in source) return source;
  return {
    id: source.id, key: layoutKey(source), walk: toWalkLayout(source.layout),
    discoveries: source.layout.discoveries.map(({ placementId }) => placementId),
    hasStory: Boolean(source.story),
  };
}

export function createCheckpoint(source: PromptWorld | CheckpointTarget, { position, revealed, ended, storyStep }: GameState, now = new Date()): Checkpoint {
  const { id, key } = target(source);
  return checkpointSchema.parse({
    schemaVersion: CHECKPOINT_VERSION,
    worldId: id,
    layoutKey: key,
    savedAt: now.toISOString(),
    position,
    revealed: [...revealed],
    ended,
    ...(storyStep && { storyStep }),
  });
}

export type Restored = { ok: true; state: GameState } | { ok: false; reason: string };

/** Check a stored checkpoint against the saved world before resuming from it. */
export function restoreCheckpoint(source: PromptWorld | CheckpointTarget, stored: unknown): Restored {
  const { id, key, walk: layout, discoveries, hasStory } = target(source);
  const parsed = checkpointSchema.safeParse(stored);
  if (!parsed.success) return { ok: false, reason: 'The saved progress is unreadable.' };
  const checkpoint = parsed.data;
  if (checkpoint.worldId !== id) return { ok: false, reason: 'The saved progress belongs to another world.' };
  if (checkpoint.layoutKey !== key) return { ok: false, reason: 'The saved progress is from an older layout of this world.' };
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const { x, z } = checkpoint.position;
  const radius = layout.playerRadius - 0.001; // Version 1 checkpoints round to millimetres.
  if (x < minX + radius || x > maxX - radius || z < minZ + radius || z > maxZ - radius
      || blocked(checkpoint.position, layout)) {
    return { ok: false, reason: 'The saved position is outside the walkable area.' };
  }
  const revealed = new Set(checkpoint.revealed);
  if (revealed.size !== checkpoint.revealed.length || checkpoint.revealed.some((id) => !discoveries.includes(id))) {
    return { ok: false, reason: 'The saved discoveries do not match this world.' };
  }
  if (checkpoint.ended && revealed.size < 2) return { ok: false, reason: 'The saved ending is not consistent with the discoveries.' };
  const { ended, storyStep } = checkpoint;
  if ((!hasStory && storyStep) || (hasStory && (ended !== (storyStep === 'first' || storyStep === 'second')
    || (storyStep !== undefined && revealed.size !== 2)))) {
    return { ok: false, reason: 'The saved conversation does not match this memory.' };
  }
  return { ok: true, state: { position: checkpoint.position, revealed, ended, ...(storyStep && { storyStep }) } };
}
