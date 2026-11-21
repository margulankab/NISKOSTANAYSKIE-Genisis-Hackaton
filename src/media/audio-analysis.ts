import type { MemoryScene } from '../shared/memory-schema';

export function measureAudio(samples: AudioBuffer): MemoryScene['music'] {
  const { duration: durationSec, length, sampleRate, numberOfChannels } = samples;
  const channels = Array.from({ length: numberOfChannels }, (_, index) => samples.getChannelData(index));
  const energyEnvelope = Array.from({ length: Math.ceil(durationSec * 10) }, (_, window) => {
    const start = Math.floor(window * sampleRate / 10);
    const end = Math.min(length, Math.floor((window + 1) * sampleRate / 10));
    let sumSquares = 0;
    for (const channel of channels) {
      for (let index = start; index < end; index++) sumSquares += channel[index] ** 2;
    }
    const sampleCount = (end - start) * numberOfChannels;
    return sampleCount > 0 ? Math.min(1, 4 * Math.sqrt(sumSquares / sampleCount)) : 0;
  });

  return {
    durationSec,
    sampleStepSec: 0.1,
    energyEnvelope,
    meanEnergy: energyEnvelope.reduce((sum, energy) => sum + energy, 0) / energyEnvelope.length,
    bpm: null,
    key: null,
    provenance: 'measured',
  };
}
