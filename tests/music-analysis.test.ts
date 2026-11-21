import { expect, test } from 'vitest';
import { measureAudio } from '../src/media/audio-analysis';
import { getMusicMotion } from '../src/scene/music-motion';

const rate = 16000;

test('uses mono RMS over each 100 ms window, including a shorter final window', () => {
  const first = new Float32Array(rate + 320).fill(0.125);
  const second = new Float32Array(rate + 320).fill(-0.0625);
  first.fill(0.75, rate);
  second.fill(-0.125, rate);
  const features = measureAudio([first, second], rate);

  expect(features.durationSec).toBe(1.02);
  expect(features.sampleStepSec).toBe(0.1);
  expect(features.energyEnvelope).toEqual([...Array<number>(10).fill(0.125), 1]);
  expect(features.meanEnergy).toBe((10 * 0.125 + 1) / 11);
  expect(features).toMatchObject({ bpm: null, key: null, provenance: 'measured' });
});

test('silence and phase cancellation produce zero energy and no movement', () => {
  const silent = measureAudio([new Float32Array(rate)], rate);
  const cancelled = measureAudio([
    new Float32Array(rate).fill(0.5), new Float32Array(rate).fill(-0.5),
  ], rate);

  expect(silent.energyEnvelope).toEqual(Array<number>(10).fill(0));
  expect(cancelled).toEqual(silent);
  expect(getMusicMotion(0.23, silent, { motionSpeed: 0.25, pulseGain: 0.04 }))
    .toEqual({ scale: 1, lift: 0 });
});

test('rejects unsupported durations and invalid PCM', () => {
  expect(() => measureAudio([new Float32Array(rate - 1)], rate)).toThrow('1 to 90 seconds');
  expect(() => measureAudio([new Float32Array(90 * rate + 1)], rate)).toThrow('1 to 90 seconds');
  const invalid = new Float32Array(rate);
  invalid[0] = NaN;
  expect(() => measureAudio([invalid], rate)).toThrow('invalid samples');
});

test('interpolates pulse from playback time and drives lift at the saved rate', () => {
  const pcm = new Float32Array(rate);
  pcm.fill(0.25, rate / 10, rate / 5);
  const music = measureAudio([pcm], rate);
  const parameters = { motionSpeed: 0.5, pulseGain: 0.04 as const };
  const motion = getMusicMotion(0.05, music, parameters);
  expect(motion.scale).toBeCloseTo(1.02, 8);
  expect(motion.lift).toBeCloseTo(0.05 * Math.sin(2 * Math.PI * 0.5 * 0.05), 8);
  expect(getMusicMotion(0.1, music, parameters).scale).toBe(1.04);
  expect(getMusicMotion(0.1, music, { ...parameters, motionSpeed: 1 }).lift).toBeGreaterThan(
    getMusicMotion(0.1, music, parameters).lift,
  );
  expect(getMusicMotion(-1, music, parameters).scale).toBe(1);
  expect(getMusicMotion(10, music, parameters).scale).toBe(1);
});
