import { Zip, ZipPassThrough, zipSync } from 'fflate';
import { expect, it } from 'vitest';
import { readZipEntries } from '../src/data/zip-entries';

const path = 'A Day Remembered/entry.txt';
const content = new TextEncoder().encode('The journal stays in its original folder.');
const allowPath = () => {};

it.each([0, 6] as const)('reads valid ZIP members at compression level %s', async (level) => {
  const archive = zipSync({ 'A Day Remembered/': new Uint8Array(), [path]: content }, { level });
  const entries = await readZipEntries(new Blob([archive]), allowPath);
  expect([...entries]).toEqual([[path, content]]);
});

it('reads ZIP entries with streaming data descriptors', async () => {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const writer = new Zip((error, chunk) => {
    if (error) throw error;
    chunks.push(new Uint8Array(chunk));
  });
  const entry = new ZipPassThrough(path);
  writer.add(entry);
  entry.push(content, true);
  writer.end();
  expect(await readZipEntries(new Blob(chunks), allowPath)).toEqual(new Map([[path, content]]));
});

it('rejects duplicate ZIP paths before extraction', async () => {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const writer = new Zip((error, chunk) => {
    if (error) throw error;
    chunks.push(new Uint8Array(chunk));
  });
  for (const entry of [new ZipPassThrough(path), new ZipPassThrough(path)]) {
    writer.add(entry);
    entry.push(content, true);
  }
  writer.end();
  await expect(readZipEntries(new Blob(chunks), allowPath)).rejects.toThrow('duplicate paths');
});

it('rejects ZIPs above the expanded size or member count limits', async () => {
  const oversized = zipSync({ [path]: new Uint8Array(40 * 1024 ** 2 + 1) }, { level: 1 });
  await expect(readZipEntries(new Blob([oversized]), allowPath)).rejects.toThrow('40 MiB expanded size limit');
  const tooMany = zipSync(Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`${path}${index}`, content])));
  await expect(readZipEntries(new Blob([tooMany]), allowPath)).rejects.toThrow('unsupported ZIP format');
});

it('rejects a stored entry whose contents fail the ZIP checksum', async () => {
  const archive = zipSync({ [path]: content }, { level: 0 });
  const firstByte = 30 + new TextEncoder().encode(path).length;
  archive[firstByte] ^= 1;
  await expect(readZipEntries(new Blob([archive]), allowPath)).rejects.toThrow('ZIP is damaged');
});
