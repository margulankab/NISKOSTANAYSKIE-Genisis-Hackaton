import type { MemoryScene } from '../shared/memory-schema';

export function getMusicMotion(
  time: number,
  { energyEnvelope, sampleStepSec }: MemoryScene['music'],
  { pulseGain, motionSpeed }: Pick<MemoryScene['presentation']['parameters'], 'pulseGain' | 'motionSpeed'>,
) {
  const sample = Math.min(Math.max(0, time / sampleStepSec), energyEnvelope.length - 1);
  const index = Math.floor(sample);
  const first = energyEnvelope[index];
  const next = energyEnvelope[Math.min(index + 1, energyEnvelope.length - 1)];
  const energy = first + (next - first) * (sample - index);
  return {
    scale: 1 + pulseGain * energy,
    lift: 0.10 * energy * Math.sin(2 * Math.PI * motionSpeed * time),
  };
}
