import { checkpointSchema } from '../world/checkpoint';
import type { Checkpoint } from '../world/checkpoint';
import { promptWorldSchema } from '../world/world-schema';
import type { PromptWorld } from '../world/world-schema';
import { checkpointsStore, localMemories, resultOf, transact, worldsStore } from './indexed-memory-repository';

export interface GameSummary {
  id: string;
  kind: 'prompt-world' | 'day';
  title: string;
  /** ISO time of the last save, or null for a day memory with no checkpoint. */
  savedAt: string | null;
  status: string;
}

export interface GameRepository {
  /** First save writes the world and checkpoint in one transaction; later saves replace the checkpoint. */
  saveGame(world: PromptWorld, checkpoint: Checkpoint): Promise<void>;
  loadGame(id: string): Promise<{ world: PromptWorld; checkpoint: unknown } | undefined>;
  listGames(): Promise<GameSummary[]>;
}

function statusOf(checkpoint: Checkpoint | undefined) {
  if (!checkpoint) return 'Not started';
  if (checkpoint.ended) return 'Completed';
  return `${checkpoint.revealed.length} of 2 discoveries`;
}

export const localGames: GameRepository = {
  async saveGame(world, checkpoint) {
    const validWorld = promptWorldSchema.parse(world);
    const validCheckpoint = checkpointSchema.parse(checkpoint);
    if (validCheckpoint.worldId !== validWorld.id) throw new Error('The checkpoint does not belong to this world.');
    await transact([worldsStore, checkpointsStore], 'readwrite', async (tx) => {
      const worlds = tx.objectStore(worldsStore);
      const existing: PromptWorld | undefined = await resultOf(worlds.get(validWorld.id));
      if (existing && JSON.stringify(existing) !== JSON.stringify(validWorld)) {
        throw new Error('A different world already uses this ID.');
      }
      const writes = [resultOf(tx.objectStore(checkpointsStore).put(validCheckpoint, validWorld.id))];
      if (!existing) writes.push(resultOf(worlds.add(validWorld, validWorld.id)));
      await Promise.all(writes);
    });
  },

  async loadGame(id) {
    const [world, checkpoint]: [unknown, unknown] = await transact([worldsStore, checkpointsStore], 'readonly', (tx) =>
      Promise.all([resultOf(tx.objectStore(worldsStore).get(id)), resultOf(tx.objectStore(checkpointsStore).get(id))]));
    if (world === undefined) return undefined;
    return { world: promptWorldSchema.parse(world), checkpoint };
  },

  async listGames() {
    const [worlds, checkpoints]: [PromptWorld[], unknown[]] = await transact([worldsStore, checkpointsStore], 'readonly', (tx) =>
      Promise.all([resultOf(tx.objectStore(worldsStore).getAll()), resultOf(tx.objectStore(checkpointsStore).getAll())]));
    const byWorld = new Map<string, Checkpoint>();
    for (const stored of checkpoints) {
      const parsed = checkpointSchema.safeParse(stored);
      if (parsed.success) byWorld.set(parsed.data.worldId, parsed.data);
    }
    const games: GameSummary[] = worlds.map(({ id, title }) => {
      const checkpoint = byWorld.get(id);
      return { id, kind: 'prompt-world', title, savedAt: checkpoint?.savedAt ?? null, status: checkpoint ? statusOf(checkpoint) : 'Progress unreadable' };
    });
    // Day memories keep their v1 records and open at spawn; they have no checkpoint in this release.
    for (const { id, title, date } of await localMemories.list()) {
      games.push({ id, kind: 'day', title, savedAt: null, status: `Day memory · ${date}` });
    }
    return games.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? '') || a.title.localeCompare(b.title));
  },
};

/** The most recently saved prompt world, for Continue. */
export async function latestGame(repository: GameRepository) {
  return (await repository.listGames()).find((game) => game.kind === 'prompt-world' && game.savedAt !== null);
}
