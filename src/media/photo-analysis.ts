import type { MemoryScene } from '../shared/memory-schema';

export type PhotoFeatures = Omit<MemoryScene['photos'][number], 'assetId' | 'caption'>;
type RGB = PhotoFeatures['palette'][number];

export async function photoThumbnail(blob: Blob) {
  const image = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, 384 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | undefined>(resolve => canvas.toBlob(value => resolve(value ?? undefined), 'image/png'));
  } finally {
    image.close();
  }
}

export async function analyzePhoto(blob: Blob): Promise<PhotoFeatures> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || blob.size > 5 * 1024 ** 2) {
    throw new Error('Choose a JPEG, PNG, or WebP photo up to 5 MiB.');
  }

  let image: ImageBitmap;
  try {
    image = await createImageBitmap(blob);
  } catch {
    throw new Error('The photo could not be decoded.');
  }

  try {
    const { width, height } = image;
    if (width * height > 16_000_000) throw new Error('The photo exceeds 16 megapixels.');

    const scale = Math.min(1, 64 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo analysis is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const bins = new Map<number, { weight: number; sum: RGB }>();
    let totalWeight = 0;
    let brightness = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, alpha] = pixels.subarray(i, i + 4);
      if (alpha === 0) continue;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bin = bins.get(key) ?? { weight: 0, sum: [0, 0, 0] };
      bin.weight += alpha;
      bin.sum[0] += r * alpha;
      bin.sum[1] += g * alpha;
      bin.sum[2] += b * alpha;
      bins.set(key, bin);
      totalWeight += alpha;
      brightness += (2126 * r + 7152 * g + 722 * b) * alpha;
    }
    if (!totalWeight) throw new Error('The photo is fully transparent.');

    const colors = [...bins]
      .sort(([aKey, a], [bKey, b]) => b.weight - a.weight || aKey - bKey)
      .slice(0, 3)
      .map(([, { weight, sum }]): RGB => [
        Math.round(sum[0] / weight), Math.round(sum[1] / weight), Math.round(sum[2] / weight),
      ]);
    const [first, second = first, third = second] = colors;
    return { width, height, palette: [first, second, third], meanLightness: brightness / (10_000 * 255 * totalWeight) };
  } finally {
    image.close();
  }
}
