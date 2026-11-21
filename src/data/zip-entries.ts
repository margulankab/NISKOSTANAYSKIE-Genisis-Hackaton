import { Inflate } from 'fflate';

const maxExpanded = 40 * 1024 ** 2;
const maxPacked = maxExpanded + 1024 ** 2;
const maxMembers = 20;
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const invalid = () => new Error('This ZIP is damaged or uses an unsupported ZIP format.');

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  return crc;
});

function checksum(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

export async function readZipEntries(zip: Blob, checkPath: (path: string) => void) {
  if (zip.size > maxPacked) throw new Error('This ZIP exceeds the archive size limit.');
  if (zip.size < 22) throw invalid();
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);

  let end = bytes.length - 22;
  const searchLimit = Math.max(0, end - 65535);
  while (end >= searchLimit && (u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length)) end--;
  if (end < searchLimit || u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) throw invalid();
  const count = u16(end + 10);
  const directory = u32(end + 16);
  if (count === 0 || count > maxMembers || directory + u32(end + 12) !== end) throw invalid();

  const members = new Map<string, { start: number; packed: number; size: number; method: number; crc: number }>();
  const ranges: { start: number; end: number }[] = [];
  let total = 0;
  let cursor = directory;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || u32(cursor) !== 0x02014b50) throw invalid();
    const flags = u16(cursor + 8);
    const method = u16(cursor + 10);
    const crc = u32(cursor + 16);
    const packed = u32(cursor + 20);
    const size = u32(cursor + 24);
    const nameLength = u16(cursor + 28);
    const next = cursor + 46 + nameLength + u16(cursor + 30) + u16(cursor + 32);
    const local = u32(cursor + 42);
    if (flags & ~0x080e || (method !== 0 && method !== 8) || u16(cursor + 34) || next > end
        || (method === 0 && packed !== size) || local + 30 > directory || u32(local) !== 0x04034b50
        || u16(local + 6) !== flags || u16(local + 8) !== method || u16(local + 26) !== nameLength) throw invalid();

    const start = local + 30 + nameLength + u16(local + 28);
    let finish = start + packed;
    if (finish > directory) throw invalid();
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name !== decoder.decode(bytes.subarray(local + 30, local + 30 + nameLength))) throw invalid();
    if (members.has(name)) throw new Error('This ZIP contains duplicate paths.');
    checkPath(name);
    if (name.endsWith('/') && size !== 0) throw invalid();

    if (flags & 8) {
      const matchesDescriptor = (offset: number) => offset + 12 <= directory
        && u32(offset) === crc && u32(offset + 4) === packed && u32(offset + 8) === size;
      if (finish + 16 <= directory && u32(finish) === 0x08074b50 && matchesDescriptor(finish + 4)) finish += 4;
      else if (!matchesDescriptor(finish)) throw invalid();
      finish += 12;
    } else if (u32(local + 14) !== crc || u32(local + 18) !== packed || u32(local + 22) !== size) {
      throw invalid();
    }

    total += size;
    if (total > maxExpanded) throw new Error('This ZIP exceeds the 40 MiB expanded size limit.');
    members.set(name, { start, packed, size, method, crc });
    ranges.push({ start: local, end: finish });
    cursor = next;
  }
  ranges.sort((a, b) => a.start - b.start);
  if (cursor !== end || ranges.at(-1)?.end !== directory
      || ranges.some((range, index) => range.start !== (ranges[index - 1]?.end ?? 0))) throw invalid();

  const entries = new Map<string, Uint8Array<ArrayBuffer>>();
  for (const [name, { start, packed, size, method, crc }] of members) {
    const input = bytes.subarray(start, start + packed);
    let output = input;
    if (method === 8) {
      output = new Uint8Array(size);
      let written = 0;
      const inflater = new Inflate((chunk) => {
        if (written + chunk.length > size) throw invalid();
        output.set(chunk, written);
        written += chunk.length;
      });
      // Bound transient output as well as the retained output buffer.
      for (let offset = 0; offset < input.length; offset += 4096) {
        inflater.push(input.subarray(offset, offset + 4096), offset + 4096 >= input.length);
      }
      if (packed === 0 || written !== size) throw invalid();
    }
    if (checksum(output) !== crc) throw invalid();
    if (!name.endsWith('/')) entries.set(name, output);
  }
  return entries;
}
