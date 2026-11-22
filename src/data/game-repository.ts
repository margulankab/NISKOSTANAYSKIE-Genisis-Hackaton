import { checkpointSchema, restoreCheckpoint } from '../world/checkpoint';
import type { Checkpoint } from '../world/checkpoint';
import { promptWorldSchema } from '../world/world-schema';
import type { PromptWorld } from '../world/world-schema';
import { restoreSoundtrack, silentSoundtrack } from '../media/world-soundtrack';
import type { SoundtrackChoice } from '../media/world-soundtrack';
import { checkpointsStore, dayCheckpointKey, localMemories, resultOf, transact, worldsStore } from './indexed-memory-repository';

export interface GameSummary {
  id: string;
  kind: 'prompt-world' | 'day';
  title: string;
  savedAt: string | null;
  status: string;
  /** For library cards: how the world looks (prompt worlds only). */
  timeOfDay?: string;
  weather?: string;
  /** For library cards: the day's date (day memories only). */
  date?: string;
}

type StoredWorld = PromptWorld | { world: PromptWorld; soundtrack: SoundtrackChoice };
type LoadedGame = { world: PromptWorld; soundtrack: SoundtrackChoice; checkpoint: unknown };

export interface GameRepository {
  saveGame(world: PromptWorld, checkpoint: Checkpoint, soundtrack: SoundtrackChoice): Promise<void>;
  loadGame(id: string): Promise<LoadedGame | undefined>;
  listGames(): Promise<GameSummary[]>;
}

function statusOf(checkpoint: Checkpoint) {
  if (checkpoint.ended) return 'Completed';
  if (checkpoint.momentsCompleted !== undefined) return `${checkpoint.momentsCompleted} ${checkpoint.momentsCompleted === 1 ? 'moment' : 'moments'} completed`;
  return `${checkpoint.revealed.length} of 2 discoveries`;
}

const worldOf = (stored: StoredWorld) => 'world' in stored ? stored.world : stored;

export const localGames: GameRepository = {
  async saveGame(world, checkpoint, soundtrack) {
    const validWorld = promptWorldSchema.parse(world);
    const validCheckpoint = checkpointSchema.parse(checkpoint);
    if (!restoreCheckpoint(validWorld, validCheckpoint).ok) throw new Error('The checkpoint does not match this world.');
    const choice = restoreSoundtrack(soundtrack);
    await transact([worldsStore, checkpointsStore], 'readwrite', async (tx) => {
      const worlds = tx.objectStore(worldsStore);
      const existing: StoredWorld | undefined = await resultOf(worlds.get(validWorld.id));
      if (existing && JSON.stringify(promptWorldSchema.parse(worldOf(existing))) !== JSON.stringify(validWorld)) {
        throw new Error('A different world already uses this ID.');
      }
      const saveWorld = worlds.put({ world: validWorld, soundtrack: choice }, validWorld.id);
      const saveProgress = tx.objectStore(checkpointsStore).put(validCheckpoint, validWorld.id);
      await Promise.all([resultOf(saveWorld), resultOf(saveProgress)]);
    });
  },

  async loadGame(id) {
    const [stored, checkpoint]: [StoredWorld | undefined, unknown] =
      await transact([worldsStore, checkpointsStore], 'readonly', (tx) =>
        Promise.all([resultOf(tx.objectStore(worldsStore).get(id)), resultOf(tx.objectStore(checkpointsStore).get(id))]));
    if (!stored) return undefined;
    return {
      world: promptWorldSchema.parse(worldOf(stored)), checkpoint,
      soundtrack: 'world' in stored ? restoreSoundtrack(stored.soundtrack)
        : silentSoundtrack('This saved world has no soundtrack.'),
    };
  },

  async listGames() {
    const [worlds, keys, checkpoints]: [StoredWorld[], IDBValidKey[], unknown[]] =
      await transact([worldsStore, checkpointsStore], 'readonly', (tx) => {
        const store = tx.objectStore(checkpointsStore);
        return Promise.all([resultOf(tx.objectStore(worldsStore).getAll()), resultOf(store.getAllKeys()), resultOf(store.getAll())]);
      });
    const byKey = new Map<IDBValidKey, Checkpoint>();
    checkpoints.forEach((stored, index) => {
      const parsed = checkpointSchema.safeParse(stored);
      if (parsed.success) byKey.set(keys[index], parsed.data);
    });
    const games: GameSummary[] = worlds.map((stored) => {
      const { id, title, interpretation } = worldOf(stored);
      const checkpoint = byKey.get(id);
      return {
        id, kind: 'prompt-world', title, savedAt: checkpoint?.savedAt ?? null,
        status: checkpoint ? statusOf(checkpoint) : 'Progress unreadable',
        timeOfDay: interpretation?.timeOfDay, weather: interpretation?.weather,
      };
    });
    for (const { id, title, date } of await localMemories.list()) {
      const checkpoint = byKey.get(dayCheckpointKey(id));
      games.push({
        id, kind: 'day', title, savedAt: checkpoint?.savedAt ?? null, date,
        status: `Day memory · ${date}${checkpoint ? ' · ' + statusOf(checkpoint) : ''}`,
      });
    }
    return games.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? '') || a.title.localeCompare(b.title));
  },
};

export function loadDayCheckpoint(id: string): Promise<unknown> {
  return transact([checkpointsStore], 'readonly', (tx) => resultOf(tx.objectStore(checkpointsStore).get(dayCheckpointKey(id))));
}

export function gamePath(game: GameSummary) {
  return (game.kind === 'day' ? '/memory/' : '/play/') + game.id;
}

export async function latestGame(repository: GameRepository) {
  return (await repository.listGames()).find((game) => game.savedAt !== null);
}
