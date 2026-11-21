import { z } from 'zod';
import { blocked } from '../gameplay/controller';
import type { Point } from '../gameplay/layout';
import { layoutKey, toWalkLayout } from './world-schema';
import type { PromptWorld } from './world-schema';

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
});
export type Checkpoint = z.infer<typeof checkpointSchema>;

export interface GameState { position: Point; revealed: ReadonlySet<string>; ended: boolean }

export function createCheckpoint(world: PromptWorld, { position, revealed, ended }: GameState, now = new Date()): Checkpoint {
  return checkpointSchema.parse({
    schemaVersion: CHECKPOINT_VERSION,
    worldId: world.id,
    layoutKey: layoutKey(world),
    savedAt: now.toISOString(),
    position: { x: Math.round(position.x * 1000) / 1000, z: Math.round(position.z * 1000) / 1000 },
    revealed: [...revealed],
    ended,
  });
}

export type Restored = { ok: true; state: GameState } | { ok: false; reason: string };

/** Check a stored checkpoint against the saved world before resuming from it. */
export function restoreCheckpoint(world: PromptWorld, stored: unknown): Restored {
  const parsed = checkpointSchema.safeParse(stored);
  if (!parsed.success) return { ok: false, reason: 'The saved progress is unreadable.' };
  const checkpoint = parsed.data;
  if (checkpoint.worldId !== world.id) return { ok: false, reason: 'The saved progress belongs to another world.' };
  if (checkpoint.layoutKey !== layoutKey(world)) return { ok: false, reason: 'The saved progress is from an older layout of this world.' };
  const layout = toWalkLayout(world.layout);
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const { x, z } = checkpoint.position;
  if (x < minX || x > maxX || z < minZ || z > maxZ || blocked(checkpoint.position, layout)) {
    return { ok: false, reason: 'The saved position is outside the walkable area.' };
  }
  const discoveries = new Set(world.layout.discoveries.map(({ placementId }) => placementId));
  const revealed = new Set(checkpoint.revealed);
  if (revealed.size !== checkpoint.revealed.length || checkpoint.revealed.some((id) => !discoveries.has(id))) {
    return { ok: false, reason: 'The saved discoveries do not match this world.' };
  }
  if (checkpoint.ended && revealed.size < 2) return { ok: false, reason: 'The saved ending is not consistent with the discoveries.' };
  return { ok: true, state: { position: checkpoint.position, revealed, ended: checkpoint.ended } };
}
