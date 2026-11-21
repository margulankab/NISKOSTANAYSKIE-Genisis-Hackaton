import { decodeAudio } from '../intake/validate-day-draft';
import type { MemoryScene } from '../shared/memory-schema';
import { measureAudio, measureAudioBuffer } from './audio-analysis';
import { encodeMonoWav } from './mono-wav';

export const soundtrackCatalogVersion = 1;

const catalogRights = {
  source: 'Original synthesized composition created for Memory Worlds.',
  credit: 'Memory Worlds',
  permission: 'Cleared for in-game playback, portable export, and demo use.',
} as const;

const dimensions = ['mood', 'setting', 'energy'] as const;
export type SoundtrackCues = Partial<Record<(typeof dimensions)[number], readonly string[]>>;
type Composition = {
  title: string;
  tags: Required<SoundtrackCues>;
  beatSeconds: number;
  notes: readonly number[];
  bass: readonly number[];
  amplitude: number;
  percussion: number;
};

const compositions = {
  'coastal-light': {
    title: 'Coastal Light',
    tags: { mood: ['calm', 'peaceful'], setting: ['coastal', 'cove', 'shore', 'lighthouse'], energy: ['gentle', 'low'] },
    beatSeconds: 0.85,
    notes: [62, 69, 74, 66, 64, 69, 73, 69, 62, 66, 69, 74, 71, 69, 66, 64],
    bass: [38, 45, 43, 45], amplitude: 0.17, percussion: 0,
  },
  'lantern-market': {
    title: 'Lantern Market',
    tags: { mood: ['joyful', 'lively'], setting: ['market', 'city', 'stall', 'railway'], energy: ['bright', 'high'] },
    beatSeconds: 0.48,
    notes: [65, 69, 72, 74, 72, 69, 67, 64, 65, 69, 72, 77, 76, 72, 74, 67],
    bass: [41, 45, 46, 48], amplitude: 0.32, percussion: 0.16,
  },
  'still-rooms': {
    title: 'Still Rooms',
    tags: { mood: ['subdued', 'nostalgic', 'tense'], setting: ['room', 'indoors', 'fog'], energy: ['subdued', 'low'] },
    beatSeconds: 1.1,
    notes: [57, 60, 64, 60, 55, 59, 62, 59, 53, 57, 60, 64, 55, 62, 59, 55],
    bass: [33, 31, 29, 31], amplitude: 0.12, percussion: 0,
  },
} satisfies Record<string, Composition>;

export type CatalogTrackId = keyof typeof compositions;
const catalogIds = Object.keys(compositions) as CatalogTrackId[];
export const soundtrackCatalog = catalogIds.map((id) => ({
  id, version: soundtrackCatalogVersion, title: compositions[id].title, tags: compositions[id].tags, rights: catalogRights,
}));

type TrackDetails = {
  assetId: string;
  title: string;
  mime: 'audio/wav' | 'audio/mpeg';
  rights: { source: string; credit: string; permission: string };
  music: MemoryScene['music'];
  reason: string;
};

export type WorldSoundtrackRecord = { kind: 'silent'; reason: string }
  | (TrackDetails & ({ kind: 'catalog'; trackId: string; catalogVersion: number } | { kind: 'upload' }));

export type ResolvedWorldSoundtrack = {
  record: WorldSoundtrackRecord;
  blob: Blob | null;
};

function voice(note: number, time: number, beat: number, softness: number) {
  const phase = 2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * time;
  const envelope = Math.sin(Math.PI * time / beat) * Math.exp(-softness * time / beat);
  return (Math.sin(phase) + 0.22 * Math.sin(2 * phase) + 0.09 * Math.sin(3 * phase)) * envelope;
}

function renderComposition({ notes, bass, beatSeconds, amplitude, percussion }: Composition) {
  const sampleRate = 16000;
  const beatSamples = Math.round(beatSeconds * sampleRate);
  const pcm = new Int16Array(beatSamples * notes.length);
  for (let beat = 0; beat < notes.length; beat++) {
    const bassNote = bass[Math.floor(beat / 4)];
    for (let offset = 0; offset < beatSamples; offset++) {
      const time = offset / sampleRate;
      const progress = offset / beatSamples;
      const melody = voice(notes[beat], time, beatSeconds, 1.5);
      const low = voice(bassNote, time, beatSeconds, 0.85) * (beat % 2 === 0 ? 0.62 : 0.29);
      const drum = beat % 2 === 0
        ? percussion * Math.sin(2 * Math.PI * (64 * time + 4 * (1 - Math.exp(-22 * time))))
          * Math.sin(Math.PI * progress) * Math.exp(-8 * progress)
        : 0;
      pcm[beat * beatSamples + offset] = Math.round((amplitude * (melody + low) + drum) * 32767);
    }
  }
  return {
    blob: encodeMonoWav(pcm, sampleRate),
    music: measureAudio([Float32Array.from(pcm, (sample) => sample / 32768)], sampleRate),
  };
}

export function createCatalogSoundtrack(trackId: CatalogTrackId, matchedTags: readonly string[] = []): ResolvedWorldSoundtrack {
  const composition = compositions[trackId];
  const { blob, music } = renderComposition(composition);
  return {
    blob,
    record: {
      kind: 'catalog', trackId, catalogVersion: soundtrackCatalogVersion,
      assetId: trackId + '-v' + soundtrackCatalogVersion, title: composition.title,
      mime: 'audio/wav', rights: catalogRights, music,
      reason: matchedTags.length ? 'Matched cues: ' + matchedTags.join(', ') + '.' : 'Selected by the player.',
    },
  };
}

export function selectWorldSoundtrack(
  cues: SoundtrackCues,
  available: readonly CatalogTrackId[] = catalogIds,
): ResolvedWorldSoundtrack {
  const normalized = dimensions.map((dimension) => new Set(cues[dimension]?.map((cue) => cue.trim().toLowerCase())));
  const matches = soundtrackCatalog.filter(({ id }) => available.includes(id)).map(({ id, tags }) => {
    const matchedTags = dimensions.flatMap((dimension, index) => tags[dimension].filter((tag) => normalized[index].has(tag)));
    return { id, matchedTags };
  });
  matches.sort((left, right) => right.matchedTags.length - left.matchedTags.length
    || Number(left.id > right.id) - Number(left.id < right.id));
  const best = matches[0];
  if (best?.matchedTags.length) return createCatalogSoundtrack(best.id, [...new Set(best.matchedTags)]);
  return {
    blob: null,
    record: { kind: 'silent', reason: available.length ? 'No cleared soundtrack matched this world.' : 'No cleared soundtrack is available.' },
  };
}

export async function createUploadedSoundtrack(file: File, authorized: boolean): Promise<ResolvedWorldSoundtrack> {
  if (!authorized) throw new Error('Confirm permission to use this audio in your world.');
  const { mime, blob, samples } = await decodeAudio(file);
  return {
    blob,
    record: {
      kind: 'upload', assetId: crypto.randomUUID(), mime, title: file.name,
      rights: {
        source: 'Local file supplied by the player.', credit: file.name,
        permission: 'Player confirmed permission for inclusion, playback, and portable export.',
      },
      reason: 'Uploaded by the player.', music: measureAudioBuffer(samples),
    },
  };
}
