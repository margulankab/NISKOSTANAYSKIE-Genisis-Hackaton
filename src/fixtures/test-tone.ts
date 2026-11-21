import { measureAudio } from '../media/audio-analysis';
import { encodeMonoWav } from '../media/mono-wav';
import type { MemoryScene } from '../shared/memory-schema';

export function createTestTone(frequency: number, amplitude: number): { blob: Blob; music: MemoryScene['music'] } {
  const durationSec = 4;
  const sampleRate = 16000;
  const sampleCount = durationSec * sampleRate;
  const pcm = new Int16Array(sampleCount);
  for (let index = 0; index < sampleCount; index++) {
    const time = index / sampleRate;
    const fade = Math.min(1, time * 5, (durationSec - time) * 5);
    const wave = Math.sin(2 * Math.PI * frequency * time);
    pcm[index] = Math.round(32767 * wave * amplitude * fade);
  }

  return {
    blob: encodeMonoWav(pcm, sampleRate),
    music: measureAudio([Float32Array.from(pcm, (sample) => sample / 32768)], sampleRate),
  };
}
