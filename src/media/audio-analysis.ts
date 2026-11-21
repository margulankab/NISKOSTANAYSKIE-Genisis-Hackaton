import type { MemoryScene } from '../shared/memory-schema';

const sampleStepSec = 0.1;
const analysisSampleRate = 16000;

export function measureAudio(channels: readonly Float32Array[], sampleRate: number): MemoryScene['music'] {
  const sampleCount = channels[0]?.length ?? 0;
  const durationSec = sampleCount / sampleRate;
  if (!Number.isFinite(durationSec) || durationSec < 1 || durationSec > 90) {
    throw new Error('Choose an audio excerpt from 1 to 90 seconds.');
  }

  const energyEnvelope: number[] = [];
  const windowCount = Math.ceil(durationSec * 10);
  for (let window = 0; window < windowCount; window++) {
    const start = Math.round(window * sampleRate / 10);
    const end = Math.min(sampleCount, Math.round((window + 1) * sampleRate / 10));
    let sumSquares = 0;
    for (let index = start; index < end; index++) {
      let sample = 0;
      for (const channel of channels) sample += channel[index];
      sumSquares += (sample / channels.length) ** 2;
    }
    const energy = 4 * Math.sqrt(sumSquares / (end - start));
    if (!Number.isFinite(energy)) throw new Error('The audio contains invalid samples.');
    energyEnvelope.push(Math.min(1, energy));
  }
  const meanEnergy = energyEnvelope.reduce((sum, energy) => sum + energy, 0) / energyEnvelope.length;

  return { durationSec, sampleStepSec, energyEnvelope, meanEnergy, bpm: null, key: null, provenance: 'measured' };
}

export async function decodeAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const decoder = new OfflineAudioContext(1, 1, analysisSampleRate);
  return decoder.decodeAudioData(await blob.arrayBuffer());
}

export function measureAudioBuffer(buffer: AudioBuffer): MemoryScene['music'] {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  return measureAudio(channels, buffer.sampleRate);
}

export async function analyzeAudio(blob: Blob): Promise<MemoryScene['music']> {
  return measureAudioBuffer(await decodeAudioBuffer(blob));
}
