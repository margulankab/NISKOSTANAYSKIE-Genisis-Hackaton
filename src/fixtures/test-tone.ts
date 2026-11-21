import type { MemoryScene } from '../shared/memory-schema';

export function createTestTone(frequency: number, amplitude: number): { blob: Blob; music: MemoryScene['music'] } {
  const durationSec = 4;
  const sampleRate = 16000;
  const frameSize = sampleRate / 10;
  const sampleCount = durationSec * sampleRate;
  const bytes = new ArrayBuffer(44 + sampleCount * 2);
  const wav = new DataView(bytes);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) {
      wav.setUint8(offset + index, value.charCodeAt(index));
    }
  };

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
  wav.setUint32(40, sampleCount * 2, true);

  const energyEnvelope = [];
  for (let offset = 0; offset < sampleCount; offset += frameSize) {
    let sumSquares = 0;
    for (let index = offset; index < offset + frameSize; index++) {
      const time = index / sampleRate;
      const fade = Math.min(1, time * 5, (durationSec - time) * 5);
      const wave = Math.sin(2 * Math.PI * frequency * time);
      const sample = Math.round(32767 * wave * amplitude * fade);
      wav.setInt16(44 + index * 2, sample, true);
      sumSquares += (sample / 32768) ** 2;
    }
    energyEnvelope.push(Math.min(1, 4 * Math.sqrt(sumSquares / frameSize)));
  }

  return {
    blob: new Blob([bytes], { type: 'audio/wav' }),
    music: {
      durationSec,
      sampleStepSec: 0.1,
      energyEnvelope,
      meanEnergy: energyEnvelope.reduce((sum, value) => sum + value, 0) / energyEnvelope.length,
      bpm: null,
      key: null,
      provenance: 'measured',
    },
  };
}
