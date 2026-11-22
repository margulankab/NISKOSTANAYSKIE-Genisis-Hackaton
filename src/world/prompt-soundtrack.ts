import { createCatalogSoundtrack, selectWorldSoundtrack, silentSoundtrack } from '../media/world-soundtrack';
import type { SoundtrackChoice } from '../media/world-soundtrack';
import type { PromptWorld } from './world-schema';
import { songCues } from '../music/song';
import { compositions } from '../media/soundtrack-catalog';

const scoreSettings = new Set<string>(Object.values(compositions).flatMap(({ tags }) => tags.setting));

export function promptSoundtrack({ prompt, interpretation, layout, story, scene, song }: PromptWorld): SoundtrackChoice {
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
  if (interpretation.timeOfDay === 'night') setting.push('night');
  if (interpretation.timeOfDay === 'dawn') setting.push('dawn');
  if (interpretation.weather === 'rain' || interpretation.weather === 'snow') setting.push(interpretation.weather);
  // The layout's own kind (a ballfield, a station, woods…) and any words that name a setting in the score.
  if (layout.profile && !['park', 'coast', 'market', 'city'].includes(layout.profile)) setting.push(layout.profile);
  for (const word of words) if (scoreSettings.has(word) && !setting.includes(word)) setting.push(word);

  const mood = ['calm', 'peaceful', 'joyful', 'lively', 'subdued', 'nostalgic', 'tense', 'curious', 'relieved'].filter((cue) => words.has(cue));
  if (['funeral', 'grief', 'grieving', 'mourning', 'memorial'].some((cue) => words.has(cue))) mood.push('mourning');
  const plotMood = layout.plot?.moments.at(-1)?.mood;
  if (plotMood && !mood.includes(plotMood)) mood.push(plotMood);
  if (story && !mood.includes(story.mood)) mood.push(story.mood);
  if (scene && !mood.includes(scene.plan.intent.mood)) mood.push(scene.plan.intent.mood);
  const energy = ['gentle', 'bright', 'subdued', 'low', 'high'].filter((cue) => words.has(cue));
  if (layout.profile === 'water-park') energy.push('bright', 'high');
  if (layout.profile === 'park') { mood.push('calm'); energy.push('gentle'); setting.push('park'); }
  // The player's own song leads: pick from its genre, tempo and year (plus the setting) first,
  // and only fall back to the world's generic cues when nothing in the catalog matches the song.
  const fromSong = songCues(song);
  if (fromSong.mood.length || fromSong.energy.length) {
    const bySong = selectWorldSoundtrack({ setting, mood: fromSong.mood, energy: fromSong.energy });
    if (bySong.record.kind !== 'silent') return { ...bySong, muted: false };
  }
  if (layout.direction) {
    const { track, reasons } = layout.direction;
    if (track === 'silence') return silentSoundtrack(reasons.audio);
    const choice = createCatalogSoundtrack(track);
    return { ...choice, record: { ...choice.record, reason: reasons.audio }, muted: false };
  }
  const mainMoment = layout.plot?.moments.at(-1);
  if (mainMoment) {
    const emotion = mainMoment.mood === 'relieved' ? 'calm' : mainMoment.mood === 'curious' ? 'nostalgic' : mainMoment.mood;
    const byPlot = selectWorldSoundtrack({ setting: [], mood: [emotion], energy: [] });
    if (byPlot.record.kind !== 'silent') return { ...byPlot, muted: false };
  }
  return { ...selectWorldSoundtrack({ setting, mood, energy }), muted: false };
}
