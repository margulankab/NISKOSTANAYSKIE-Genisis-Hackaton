export function encodeMonoWav(samples: Int16Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const wav = new DataView(bytes);
  function writeText(offset: number, value: string) {
    for (let index = 0; index < value.length; index++) wav.setUint8(offset + index, value.charCodeAt(index));
  }

  writeText(0, 'RIFF');
  wav.setUint32(4, bytes.byteLength - 8, true);
  writeText(8, 'WAVEfmt ');
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, sampleRate, true);
  wav.setUint32(28, sampleRate * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  writeText(36, 'data');
  wav.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index++) wav.setInt16(44 + index * 2, samples[index], true);
  return new Blob([bytes], { type: 'audio/wav' });
}
