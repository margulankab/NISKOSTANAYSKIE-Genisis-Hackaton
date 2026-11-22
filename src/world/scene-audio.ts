import { seededRandom } from './compose-world';
import type { SceneDirection } from './scene-direction';

type Bed = SceneDirection['bed'];
const mixGain = { hushed: .040, balanced: .075, lively: .117 };
const tone: Record<Exclude<Bed, 'quiet'>, number> = {
  breeze: 170, rain: 1700, birds: 890, station: 115, room: 230, crowd: 610, waterfront: 520, pool: 1340,
};

export function sceneAmbience(context: AudioContext) {
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(context.destination);
  let current: { cue: Bed; source: AudioBufferSourceNode; volume: GainNode } | undefined;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.connect(gain);

  function discard(previous: NonNullable<typeof current>, duration: number) {
    previous.volume.gain.setTargetAtTime(0, context.currentTime, .12);
    previous.source.stop(context.currentTime + duration);
  }

  return {
    apply(cue: Bed, mix: SceneDirection['mix'], volume: number) {
      gain.gain.setTargetAtTime(mixGain[mix] * volume, context.currentTime, .15);
      if (cue === current?.cue) return;
      if (current) discard(current, .55);
      current = undefined;
      if (cue === 'quiet') return;
      const rate = context.sampleRate;
      const buffer = context.createBuffer(1, rate * 6, rate);
      const pcm = buffer.getChannelData(0);
      const rand = seededRandom(912397 + tone[cue]);
      let low = 0, medium = 0;
      for (let i = 0; i < pcm.length; i++) {
        const t = i / rate, raw = rand() * 2 - 1;
        low += .016 * (raw - low);
        medium += .14 * (raw - medium);
        const sway = .55 + .40 * Math.sin(t * Math.PI * (cue === 'pool' ? 1 : 1 / 3));
        const shore = cue === 'waterfront' || cue === 'pool';
        const voices = cue === 'crowd' ? (.51 + .4 * Math.sin(t * Math.PI * 1.67) * Math.sin(t * Math.PI * 2.33))
          * (.12 * Math.sin(t * 1100 + Math.sin(t * 19) * 2) + .08 * Math.sin(t * 1477)) : 0;
        const chirp = cue === 'birds' && t % 1.5 < .19 ? .22 * Math.sin(t * 5100 + 20 * Math.sin(t * 50)) * Math.sin(t % 1.5 / .19 * Math.PI) : 0;
        pcm[i] = (shore ? medium * sway * 1.7 : cue === 'rain' ? raw * .46 + medium * .57 : low * 1.5 + medium * .52)
          * Math.min(1, i / 300, (pcm.length - i) / 300) + voices + chirp;
      }
      const source = context.createBufferSource();
      const entryGain = context.createGain();
      const cueFilter = context.createBiquadFilter();
      cueFilter.type = cue === 'crowd' ? 'bandpass' : 'lowpass';
      cueFilter.frequency.value = tone[cue];
      entryGain.gain.value = 0;
      source.buffer = buffer;
      source.loop = true;
      source.connect(cueFilter).connect(entryGain).connect(filter);
      source.onended = () => { source.disconnect(); cueFilter.disconnect(); entryGain.disconnect(); };
      entryGain.gain.setTargetAtTime(1, context.currentTime, .18);
      filter.frequency.value = cue === 'birds' ? 5200 : tone[cue] * 2.8;
      source.start();
      current = { cue, source, volume: entryGain };
    },
    dispose() {
      if (current) discard(current, 0);
      current = undefined;
      gain.disconnect();
      filter.disconnect();
    },
  };
}
