import { zipSync } from 'fflate';
import { z } from 'zod';
import { decodeAudio, inspectPhoto } from '../intake/validate-day-draft';
import { dayBundleSchema, memorySceneSchema, memoryTitleSchema } from '../shared/memory-schema';
import type { DayBundle } from '../shared/memory-schema';
import { readZipEntries } from './zip-entries';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const assetId = z.uuid();
const assetFields = { id: assetId, filename: z.string().min(1).max(255) };
const creditsSchema = z.strictObject({
  formatVersion: z.literal(1),
  photos: z.array(z.strictObject({ ...assetFields, mime: z.enum(['image/jpeg', 'image/png', 'image/webp']) })).min(1).max(3),
  audio: z.strictObject({ ...assetFields, mime: z.enum(['audio/wav', 'audio/mpeg']) }),
  rights: z.array(z.strictObject({
    assetId, source: z.string().min(1).max(300), permission: z.string().min(1).max(300),
  })).min(2).max(4),
});
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' };
type AssetMetadata = z.infer<typeof creditsSchema>['photos'][number] | z.infer<typeof creditsSchema>['audio'];

function assetPath({ id, mime }: AssetMetadata) {
  const directory = mime.startsWith('image/') ? 'photos' : 'audio';
  return `${directory}/${id.toLowerCase()}.${extensions[mime]}`;
}

function metadata({ id, filename, mime }: AssetMetadata) {
  return { id, filename, mime };
}

export async function exportBundle(bundle: DayBundle): Promise<Blob> {
  const { manifest, entryText, photos, audio, rights, thumbnail, world } = dayBundleSchema.parse(bundle);
  const root = `${manifest.title}/`;
  const entry = textEncoder.encode(entryText);
  if (textDecoder.decode(entry) !== entryText) throw new Error('The entry contains text that cannot be written to the ZIP.');
  const files: Record<string, Uint8Array> = {
    [`${root}manifest.json`]: textEncoder.encode(JSON.stringify(manifest)),
    [`${root}entry.txt`]: entry,
    [`${root}credits.json`]: textEncoder.encode(JSON.stringify({
      formatVersion: 1, photos: photos.map(metadata), audio: metadata(audio), rights,
    })),
  };
  if (world) files[`${root}world.json`] = textEncoder.encode(JSON.stringify(world));
  for (const asset of [...photos, audio]) {
    const path = root + assetPath(asset);
    if (Object.hasOwn(files, path)) throw new Error('This memory contains conflicting asset paths.');
    files[path] = new Uint8Array(await asset.blob.arrayBuffer());
  }
  if (thumbnail) files[`${root}preview.png`] = new Uint8Array(await thumbnail.arrayBuffer());
  // Media is already compressed or bounded. A stored ZIP also avoids blocking on compression.
  return new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' });
}

function versionOf(value: unknown, field: string) {
  return value && typeof value === 'object' && field in value ? Reflect.get(value, field) : undefined;
}

export async function importBundle(zip: Blob): Promise<DayBundle> {
  let title: string | undefined;
  const entries = await readZipEntries(zip, (path) => {
    const slash = path.indexOf('/');
    const root = path.slice(0, slash);
    if (slash < 0 || !memoryTitleSchema.safeParse(root).success || (title !== undefined && title !== root)) {
      throw new Error('This ZIP must contain one folder with a valid memory title.');
    }
    title = root;
    const member = path.slice(slash + 1);
    const isMetadata = ['', 'manifest.json', 'entry.txt', 'credits.json', 'world.json', 'preview.png', 'photos/', 'audio/'].includes(member);
    const isMedia = /^(?:photos\/[\da-f-]{36}\.(?:jpg|png|webp)|audio\/[\da-f-]{36}\.(?:mp3|wav))$/i.test(member);
    if (!isMetadata && !isMedia) throw new Error('This ZIP contains an unexpected path.');
  });

  function take(name: string, maxBytes?: number) {
    const bytes = entries.get(`${title}/${name}`);
    if (!bytes || !bytes.length) throw new Error('This ZIP is missing a required memory file.');
    if (maxBytes !== undefined && bytes.length > maxBytes) throw new Error('This ZIP contains oversized memory metadata.');
    entries.delete(`${title}/${name}`);
    return bytes;
  }

  function readJson(name: string, maxBytes: number): unknown {
    const bytes = take(name, maxBytes);
    try {
      return JSON.parse(textDecoder.decode(bytes));
    } catch {
      throw new Error('This ZIP contains unreadable memory metadata.');
    }
  }

  const rawManifest = readJson('manifest.json', 256 * 1024);
  const rawCredits = readJson('credits.json', 64 * 1024);
  if (versionOf(rawManifest, 'schemaVersion') !== 1 || versionOf(rawManifest, 'rulesVersion') !== 1
      || versionOf(rawCredits, 'formatVersion') !== 1) {
    throw new Error('This ZIP uses an unsupported memory version.');
  }
  const manifest = memorySceneSchema.safeParse(rawManifest);
  const credits = creditsSchema.safeParse(rawCredits);
  if (!manifest.success || !credits.success || manifest.data.title !== title) {
    throw new Error('This ZIP contains invalid memory metadata.');
  }
  const entryBytes = take('entry.txt', 24 * 1024);
  let entryText: string;
  try {
    entryText = textDecoder.decode(entryBytes);
  } catch {
    throw new Error('This ZIP contains an unreadable journal entry.');
  }
  const photos = credits.data.photos.map((asset) => ({
    ...asset, blob: new Blob([take(assetPath(asset))], { type: asset.mime }),
  }));
  const audio = { ...credits.data.audio, blob: new Blob([take(assetPath(credits.data.audio))], { type: credits.data.audio.mime }) };
  const thumbnail = entries.has(`${title}/preview.png`)
    ? new Blob([take('preview.png')], { type: 'image/png' }) : undefined;
  const world = entries.has(`${title}/world.json`) ? readJson('world.json', 128 * 1024) : undefined;
  if (entries.size) throw new Error('This ZIP contains files that do not belong to the memory.');

  const bundle = dayBundleSchema.safeParse({ manifest: manifest.data, entryText, photos, audio, rights: credits.data.rights, thumbnail, ...(world !== undefined && { world }) });
  if (!bundle.success) throw new Error('This ZIP contains invalid memory data or asset references.');
  try {
    for (const photo of photos) await inspectPhoto(photo.blob);
    await decodeAudio(audio.blob);
    if (thumbnail) await inspectPhoto(thumbnail);
  } catch {
    throw new Error('This ZIP contains an unreadable photo or audio file.');
  }
  return bundle.data;
}
