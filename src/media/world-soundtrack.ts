import { z } from 'zod';
import { decodeAudio } from '../intake/validate-day-draft';
import { AUDIO_BYTES_LIMIT, musicSchema } from '../shared/memory-schema';
import type { MemoryScene } from '../shared/memory-schema';
import { measureAudio, measureAudioBuffer } from './audio-analysis';
import { encodeMonoWav } from './mono-wav';
import { catalogTrackIds, compositions, soundtrackCatalogVersion, soundtrackDimensions as dimensions } from './soundtrack-catalog';
import type { CatalogTrackId, Composition, SoundtrackCues } from './soundtrack-catalog';

export { soundtrackCatalogVersion };
export type { CatalogTrackId, SoundtrackCues };


const catalogRights = {
  source: 'Original synthesized composition created for Memory Worlds.',
  credit: 'Memory Worlds',
  permission: 'Cleared for in-game playback, portable export, and demo use.',
} as const;

const catalogIds = catalogTrackIds;
export const soundtrackCatalog = catalogIds.map((id) => ({
  id, version: soundtrackCatalogVersion, title: compositions[id].title, tags: compositions[id].tags, rights: catalogRights,
}));

const trackDetails = {
  assetId: z.string().regex(/^[a-z0-9-]{1,64}$/i),
  title: z.string().min(1).max(255),
  mime: z.enum(['audio/wav', 'audio/mpeg']),
  rights: z.strictObject({
    source: z.string().min(1).max(300), credit: z.string().min(1).max(300), permission: z.string().min(1).max(300),
  }),
  music: musicSchema,
  reason: z.string().min(1).max(300),
};

const trackRecord = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('silent'), reason: trackDetails.reason }),
  z.strictObject({
    ...trackDetails, kind: z.literal('catalog'),
    trackId: z.string().regex(/^[a-z0-9-]{1,40}$/), catalogVersion: z.int().positive(),
  }),
  z.strictObject({ ...trackDetails, kind: z.literal('upload') }),
]);

export type WorldSoundtrackRecord = z.infer<typeof trackRecord>;
export type ResolvedWorldSoundtrack = { record: WorldSoundtrackRecord; blob: Blob | null };
export type SoundtrackChoice = ResolvedWorldSoundtrack & { muted: boolean };

const storedChoice = z.strictObject({ record: trackRecord, blob: z.unknown(), muted: z.boolean() });

export function silentSoundtrack(reason: string): SoundtrackChoice {
  return { record: { kind: 'silent', reason }, blob: null, muted: false };
}

export function restoreSoundtrack(value: unknown): SoundtrackChoice {
  const saved = storedChoice.safeParse(value);
  if (!saved.success) return silentSoundtrack('The soundtrack choice is unavailable.');
  const { record, blob, muted } = saved.data;
  const playable = record.kind !== 'silent' && blob instanceof Blob && blob.type === record.mime
    && blob.size > 0 && blob.size <= AUDIO_BYTES_LIMIT;
  return { record, muted, blob: playable ? blob : null };
}

function voice(note: number, time: number, beat: number, softness: number, timbre: Composition['timbre'] = 'soft') {
  const phase = 2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * time;
  const progress = time / beat;
  if (timbre === 'bell') {
    // Inharmonic partials and a quick strike: a small bell or a glass.
    const envelope = Math.min(1, progress * 40) * Math.exp(-softness * 2.2 * progress);
    return (Math.sin(phase) + 0.4 * Math.sin(2.76 * phase) + 0.18 * Math.sin(5.4 * phase)) * envelope * 0.85;
  }
  if (timbre === 'pluck') {
    const envelope = Math.min(1, progress * 60) * Math.exp(-softness * 3.4 * progress);
    return (Math.sin(phase) + 0.35 * Math.sin(2 * phase) + 0.2 * Math.sin(4 * phase)) * envelope;
  }
  if (timbre === 'pad') {
    // A slow swell with a slightly detuned second voice.
    const envelope = Math.sin(Math.PI * progress) ** 2;
    return (Math.sin(phase) + 0.6 * Math.sin(phase * 1.004) + 0.12 * Math.sin(2 * phase)) * envelope * 0.7;
  }
  const envelope = Math.sin(Math.PI * progress) * Math.exp(-softness * progress);
  return (Math.sin(phase) + 0.22 * Math.sin(2 * phase) + 0.09 * Math.sin(3 * phase)) * envelope;
}

function renderComposition({ notes, bass, beatSeconds, amplitude, percussion, timbre, bar = 4 }: Composition) {
  const sampleRate = 16000;
  const beatSamples = Math.round(beatSeconds * sampleRate);
  const pcm = new Int16Array(beatSamples * notes.length);
  for (let beat = 0; beat < notes.length; beat++) {
    const bassNote = bass[Math.floor(beat / bar) % bass.length];
    for (let offset = 0; offset < beatSamples; offset++) {
      const time = offset / sampleRate;
      const progress = offset / beatSamples;
      const melody = voice(notes[beat], time, beatSeconds, 1.5, timbre);
      const low = voice(bassNote, time, beatSeconds, 0.85) * (beat % (bar === 3 ? 3 : 2) === 0 ? 0.62 : 0.29);
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
  // Ties go to the earlier, broader track, so the specialised ones (a funeral waltz, a ballpark anthem) need their own cues.
  matches.sort((left, right) => right.matchedTags.length - left.matchedTags.length
    || catalogIds.indexOf(left.id) - catalogIds.indexOf(right.id));
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
      kind: 'upload', assetId: crypto.randomUUID(), mime, title: file.name.slice(0, 255) || 'Uploaded soundtrack',
      rights: {
        source: 'Local file supplied by the player.', credit: file.name.slice(0, 255) || 'Uploaded soundtrack',
        permission: 'Player confirmed permission for inclusion, playback, and portable export.',
      },
      reason: 'Uploaded by the player.', music: measureAudioBuffer(samples),
    },
  };
}
