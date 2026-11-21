export function createSoundtrack() {
  const sampleRate = 16000;
  const sampleCount = 12 * sampleRate;
  const bytes = new ArrayBuffer(44 + 2 * sampleCount);
  const wav = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) wav.setUint8(offset + index, value.charCodeAt(index));
  };
  tag(0, 'RIFF');
  wav.setUint32(4, bytes.byteLength - 8, true);
  tag(8, 'WAVEfmt ');
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, sampleRate, true);
  wav.setUint32(28, 2 * sampleRate, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  tag(36, 'data');
  wav.setUint32(40, 2 * sampleCount, true);

  let seed = 42;
  let filteredNoise = 0;
  for (let index = 0; index < sampleCount; index++) {
    const t = index / sampleRate;
    const phase = (0.9 * t + 0.09 * t * t) % 1;
    const thump = Math.exp(-phase * 24) + 0.52 * Math.exp(-Math.max(0, phase - 0.19) * 28) * (phase >= 0.19 ? 1 : 0);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    filteredNoise += 0.2 * (2 * seed / 0xFFFFFFFF - 1 - filteredNoise);
    const rush = t < 5.65 ? 0 : Math.min(1, (t - 5.65) * 16) * Math.exp(-(t - 5.65) * 0.72);
    const fade = Math.min(1, t * 3, (12 - t) * 2);
    const tone = Math.sin(2 * Math.PI * 61 * t) * thump * (0.12 - 0.05 * rush);
    const sample = fade * (tone + 0.39 * rush * filteredNoise);
    wav.setInt16(44 + 2 * index, Math.round(32767 * sample), true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
