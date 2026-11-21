import { selectWorldSoundtrack } from '../media/world-soundtrack';
import type { SoundtrackChoice } from '../media/world-soundtrack';
import type { PromptWorld } from './world-schema';

export function promptSoundtrack({ prompt, interpretation, layout, story, scene }: PromptWorld): SoundtrackChoice {
  const words = new Set(prompt.toLowerCase().match(/[\p{L}]+/gu));
  const setting: string[] = [];
  if (layout.placements.some(({ recipe }) => recipe === 'lighthouse' || recipe === 'pier' || recipe === 'boat')) {
    setting.push('coastal');
  }
  if (layout.placements.some(({ recipe }) => recipe === 'lighthouse')) setting.push('lighthouse');
  if (layout.water && words.has('cove')) setting.push('cove');
  if (layout.water && (words.has('shore') || words.has('beach'))) setting.push('shore');
  if (layout.placements.some(({ recipe }) => recipe === 'stall')) setting.push('market', 'stall');
  if (layout.placements.some(({ recipe }) => recipe === 'bridge') && words.has('railway')) setting.push('railway');
  if (interpretation.terms.some(({ zone }) => zone === 'paved')) setting.push('city');
  if (layout.indoor) setting.push('indoors', 'room');
  if (interpretation.weather === 'fog') setting.push('fog');

  const mood = ['calm', 'peaceful', 'joyful', 'lively', 'subdued', 'nostalgic', 'tense'].filter((cue) => words.has(cue));
  if (story && !mood.includes(story.mood)) mood.push(story.mood);
  if (scene && !mood.includes(scene.plan.intent.mood)) mood.push(scene.plan.intent.mood);
  const energy = ['gentle', 'bright', 'subdued', 'low', 'high'].filter((cue) => words.has(cue));
  if (layout.profile === 'water-park') energy.push('bright', 'high');
  if (layout.profile === 'park') { mood.push('calm'); energy.push('gentle'); }
  return { ...selectWorldSoundtrack({ setting, mood, energy }), muted: false };
}
