import { dayBundleSchema } from '../shared/memory-schema';
import type { DayBundle } from '../shared/memory-schema';

export type DaySummary = Pick<DayBundle['manifest'], 'id' | 'title' | 'date'> & {
  thumbnail?: Blob;
  photo?: Blob;
  palette?: DayBundle['manifest']['photos'][number]['palette'];
};

export interface MemoryRepository {
  save(bundle: DayBundle): Promise<void>;
  list(): Promise<DaySummary[]>;
  load(id: string): Promise<DayBundle | undefined>;
  delete(id: string): Promise<void>;
  exportDay(id: string): Promise<Blob>;
  importDay(zip: Blob): Promise<string>;
}

type MemoryStore = Pick<MemoryRepository, 'save' | 'list' | 'load' | 'delete'>;

export function createInMemoryStore(): MemoryStore {
  const days = new Map<string, DayBundle>();
  return {
    async save(bundle) {
      const validated = dayBundleSchema.parse(bundle);
      days.set(validated.manifest.id, validated);
    },
    async list() {
      return Array.from(days.values(), ({ manifest: { id, title, date } }) => ({ id, title, date }));
    },
    async load(id) {
      const bundle = days.get(id);
      return bundle && dayBundleSchema.parse(bundle);
    },
    async delete(id) {
      days.delete(id);
    },
  };
}
