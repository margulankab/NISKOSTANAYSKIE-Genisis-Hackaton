import { readSettings } from '../menus/settings';
import type { PlotMoment } from './plot-schema';

const pitches = { breeze: 105, rain: 170, birds: 640, station: 72, room: 130, quiet: 0, crowd: 180, waterfront: 128, pool: 240 };

export function plotSound(context: AudioContext | null, action: PlotMoment['actions'][number]['kind'] | 'ambience', ambience: PlotMoment['ambience']) {
  if (context?.state !== 'running') return;
  const scale = readSettings().volume;
  if (!scale) return;
  const frequency = action === 'ambience' ? pitches[ambience]
    : action === 'strike' ? 230 : action === 'depart' ? 90 : action === 'react' || action === 'laugh' ? 440
      : action === 'throw' ? 155 : action === 'slide' ? 350 : action === 'sip' ? 410
        : ['mourn', 'talk'].includes(action) ? 0 : 300;
  if (!frequency) return;
  const time = context.currentTime;
  const length = action === 'ambience' ? 1.9 : action === 'depart' ? 1 : action === 'slide' ? .64 : action === 'react' || action === 'laugh' ? .4 : .16;
  if (action === 'strike' || action === 'depart' || action === 'slide' ||
    action === 'ambience' && ['breeze', 'rain', 'station', 'crowd', 'waterfront', 'pool'].includes(ambience)) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = action === 'slide' ? 2150 : action === 'strike' ? 1750 : ambience === 'rain' ? 1050 : 470;
    const volume = context.createGain();
    volume.gain.setValueAtTime(.0001, time);
    volume.gain.exponentialRampToValueAtTime((action === 'strike' ? .15 : .05) * scale, time + .013);
    volume.gain.exponentialRampToValueAtTime(.0001, time + length);
    noise.connect(filter).connect(volume).connect(context.destination);
    noise.start(time);
    return;
  }
  const tone = context.createOscillator();
  const gain = context.createGain();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(frequency, time);
  tone.frequency.exponentialRampToValueAtTime(action === 'react' ? frequency * 1.5 : frequency * .67, time + length);
  gain.gain.setValueAtTime(.0001, time);
  gain.gain.exponentialRampToValueAtTime((action === 'ambience' ? .022 : .09) * scale, time + Math.min(length * .25, .095));
  gain.gain.exponentialRampToValueAtTime(.0001, time + length);
  tone.connect(gain).connect(context.destination);
  tone.start(time);
  tone.stop(time + length);
}
