import {
  AUDIO_BYTES_LIMIT, AUDIO_DURATION_LIMIT, PHOTO_BYTES_LIMIT, PHOTO_PIXELS_LIMIT,
  entryDateSchema, entryTextSchema,
} from '../shared/memory-schema';
import type { DayBundle, MemoryScene } from '../shared/memory-schema';
import { decodeAudioBuffer, measureAudioBuffer } from '../media/audio-analysis';

type Photo = DayBundle['photos'][number];
type Audio = DayBundle['audio'];

export interface DayDraftInput {
  date: string;
  entryText: string;
  photos: readonly File[];
  audio: File | null;
  hasPermission: boolean;
}

export interface ValidatedDayDraft {
  entryId: string;
  entryText: string;
  date: string;
  photos: (Photo & { width: number; height: number })[];
  audio: Audio & { music: MemoryScene['music'] };
  rights: DayBundle['rights'];
}

export type DraftErrors = Partial<Record<keyof DayDraftInput, string>>;
type ValidationResult = { ok: true; draft: ValidatedDayDraft } | { ok: false; errors: DraftErrors };

const mimeAliases: ReadonlyMap<string, string> = new Map([
  ['audio/wave', 'audio/wav'],
  ['audio/x-wav', 'audio/wav'],
  ['audio/vnd.wave', 'audio/wav'],
  ['audio/mp3', 'audio/mpeg'],
]);

function verifyType(claimed: string, detected: string) {
  if (claimed && (mimeAliases.get(claimed) ?? claimed) !== detected) {
    throw new IntakeError('The file type does not match its contents. Choose the original file.');
  }
}

class IntakeError extends Error {}

function hasText(bytes: Uint8Array, offset: number, text: string) {
  return Array.from(text).every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}

async function readBytes(blob: Blob, start: number, size: number) {
  return new Uint8Array(await blob.slice(start, start + size).arrayBuffer());
}

function photoMime(header: Uint8Array): Photo['mime'] {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)) return 'image/png';
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg';
  if (hasText(header, 0, 'RIFF') && hasText(header, 8, 'WEBP')) return 'image/webp';
  throw new IntakeError('Choose a JPEG, PNG, or WebP image.');
}

function isMp3Frame(bytes: Uint8Array) {
  return bytes.length >= 4
    && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0
    && (bytes[1] & 0x18) !== 0x08 && (bytes[1] & 0x06) === 0x02
    && (bytes[2] & 0xf0) !== 0xf0 && (bytes[2] & 0x0c) !== 0x0c;
}

async function audioMime(file: Blob): Promise<Audio['mime']> {
  const header = await readBytes(file, 0, 12);
  if (hasText(header, 0, 'RIFF') && hasText(header, 8, 'WAVE')) return 'audio/wav';
  if (isMp3Frame(header)) return 'audio/mpeg';
  if (hasText(header, 0, 'ID3') && header.length >= 10) {
    const sizeBytes = header.subarray(6, 10);
    if (sizeBytes.every((byte) => byte < 128)) {
      const tagSize = sizeBytes.reduce((size, byte) => size * 128 + byte, 0);
      const footerBytes = header[3] === 4 && (header[5] & 0x10) ? 10 : 0;
      if (isMp3Frame(await readBytes(file, 10 + tagSize + footerBytes, 4))) return 'audio/mpeg';
    }
  }
  throw new IntakeError('Choose an MP3 or WAV audio file.');
}

export async function inspectPhoto(file: Blob) {
  if (!file.size || file.size > PHOTO_BYTES_LIMIT) throw new IntakeError('Choose a nonempty photo up to 5 MiB.');
  const mime = photoMime(await readBytes(file, 0, 12));
  verifyType(file.type, mime);
  const blob = file.slice(0, file.size, mime);
  const image = await createImageBitmap(blob);
  try {
    const { width, height } = image;
    if (width * height > PHOTO_PIXELS_LIMIT) {
      throw new IntakeError('Choose a photo with at most 16 megapixels.');
    }
    return { mime, blob, width, height };
  } finally {
    image.close();
  }
}

function durationInRange(duration: number) {
  return Number.isFinite(duration) && duration >= 1 && duration <= AUDIO_DURATION_LIMIT;
}

async function readAudioDuration(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const element = document.createElement('audio');
  element.preload = 'metadata';
  try {
    return await new Promise<number>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Audio metadata timed out.')), 8000);
      element.onloadedmetadata = () => {
        window.clearTimeout(timeout);
        resolve(element.duration);
      };
      element.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Audio metadata is unreadable.'));
      };
      element.src = url;
    });
  } finally {
    element.onloadedmetadata = null;
    element.onerror = null;
    element.removeAttribute('src');
    element.load();
    URL.revokeObjectURL(url);
  }
}

export async function decodeAudio(file: Blob) {
  if (!file.size || file.size > AUDIO_BYTES_LIMIT) throw new IntakeError('Choose a nonempty audio file up to 10 MiB.');
  const mime = await audioMime(file);
  verifyType(file.type, mime);
  const blob = file.slice(0, file.size, mime);
  const durationMessage = 'Choose an audio excerpt from 1 to 90 seconds.';
  if (!durationInRange(await readAudioDuration(blob))) throw new IntakeError(durationMessage);
  const samples = await decodeAudioBuffer(blob);
  if (!durationInRange(samples.duration)) throw new IntakeError(durationMessage);
  return { mime, blob, samples };
}

function fileError(error: unknown, file: File, kind: string) {
  const detail = error instanceof IntakeError ? error.message : `Choose a ${kind} file your browser can open.`;
  return `${file.name} — ${detail}`;
}

export async function validateDayDraft(input: DayDraftInput): Promise<ValidationResult> {
  const errors: DraftErrors = {};
  const date = entryDateSchema.safeParse(input.date);
  if (!date.success) errors.date = 'Enter a valid date.';
  if (!entryTextSchema.safeParse(input.entryText).success) {
    errors.entryText = 'Write 20 to 6,000 characters about your day.';
  }
  if (input.photos.length < 1 || input.photos.length > 3) {
    errors.photos = 'Choose one to three photos.';
  } else {
    const invalidPhoto = input.photos.find(({ size }) => !size || size > PHOTO_BYTES_LIMIT);
    if (invalidPhoto) errors.photos = `${invalidPhoto.name} — Choose a nonempty photo up to 5 MiB.`;
  }
  const audioFile = input.audio;
  if (!audioFile) {
    errors.audio = 'Choose one authorized audio file.';
  } else if (!audioFile.size || audioFile.size > AUDIO_BYTES_LIMIT) {
    errors.audio = `${audioFile.name} — Choose a nonempty audio file up to 10 MiB.`;
  }
  if (!input.hasPermission) errors.hasPermission = 'Confirm permission to use the selected media.';
  if (!date.success || !audioFile || Object.keys(errors).length) return { ok: false, errors };

  const photos: ValidatedDayDraft['photos'] = [];
  for (const file of input.photos) {
    try {
      photos.push({ id: crypto.randomUUID(), filename: file.name, ...await inspectPhoto(file) });
    } catch (error) {
      errors.photos = fileError(error, file, 'photo');
      break;
    }
  }
  let audio: ValidatedDayDraft['audio'];
  try {
    const { mime, blob, samples } = await decodeAudio(audioFile);
    audio = { id: crypto.randomUUID(), filename: audioFile.name, mime, blob, music: measureAudioBuffer(samples) };
  } catch (error) {
    errors.audio = fileError(error, audioFile, 'sound');
    return { ok: false, errors };
  }
  if (errors.photos) return { ok: false, errors };

  const rights = [...photos, audio].map(({ id }) => ({
    assetId: id,
    source: 'File supplied by the person creating the entry.',
    permission: 'User confirmed ownership or permission for inclusion, playback, and export.',
  }));
  return { ok: true, draft: {
    entryId: crypto.randomUUID(), entryText: input.entryText, date: date.data, photos, audio, rights,
  } };
}
