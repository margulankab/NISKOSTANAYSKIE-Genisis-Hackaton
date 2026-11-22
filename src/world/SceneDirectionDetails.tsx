import type { SoundtrackChoice } from '../media/world-soundtrack';
import { explicitSceneTime, explicitSceneWeather } from './scene-direction';
import type { SceneDirection } from './scene-direction';
import type { Interpretation } from './layout-schema';

const swatches = { horizon: 'Horizon', sky: 'Sky', light: 'Key light', surface: 'Surfaces', accent: 'Accents' } as const;
const beds = {
  quiet: 'Quiet', breeze: 'Breeze', rain: 'Rain', birds: 'Birdsong', station: 'Station hum', room: 'Room tone',
  crowd: 'Crowd murmur', waterfront: 'Water lapping', pool: 'Pool water',
} as const;

export function SceneDirectionDetails({ direction, interpretation, prompt, soundtrack, journal = false, song = false, momentBed, photoAccent }: {
  direction: SceneDirection; interpretation: Interpretation; prompt: string;
  soundtrack?: SoundtrackChoice; journal?: boolean; song?: boolean; momentBed?: SceneDirection['bed'];
  photoAccent?: string;
}) {
  const record = soundtrack?.record;
  const track = journal ? 'Your original soundtrack' : record?.kind === 'silent' ? 'No music' : record?.title;
  const trackIsDirected = record?.kind === 'silent' ? direction.track === 'silence' : record?.kind === 'catalog' && record.trackId === direction.track;
  const time = explicitSceneTime(prompt) ? 'You specified this time of day.' : direction.reasons.time;
  const weather = explicitSceneWeather(prompt) ? 'You specified this weather.' : direction.reasons.weather;
  const liveBed = momentBed ?? direction.bed;
  return <details className="scene-explanation">
    <summary>Why this scene?</summary>
    <dl>
      <div><dt>Color and light</dt><dd>
        <ul className="scene-palette" aria-label="Scene colors">
          {(Object.keys(swatches) as (keyof typeof swatches)[]).map(role => <li key={role}>
            <span aria-hidden="true" style={{ backgroundColor: direction.palette[role] }} />{swatches[role]} {direction.palette[role]}
          </li>)}
          {photoAccent && <li><span aria-hidden="true" style={{ backgroundColor: photoAccent }} />Photo accents {photoAccent}</li>}
        </ul>
        {direction.reasons.palette}{photoAccent && ' The journal photo adds a color accent to nearby props.'}
      </dd></div>
      <div><dt>Time of day · {interpretation.timeOfDay}</dt><dd>{time}</dd></div>
      <div><dt>Weather · {interpretation.weather}</dt><dd>{weather}</dd></div>
      <div><dt>Sound · {track ?? 'Scene ambience'}</dt><dd>
        {journal ? 'The visit uses the soundtrack saved with your journal.' : song ? 'Your song remains attached to the visit.'
          : trackIsDirected ? direction.reasons.audio : record?.reason}
        {' '}{beds[liveBed]} with a {direction.mix} mix.
        {soundtrack?.muted && ' Audio is muted.'}
      </dd></div>
    </dl>
  </details>;
}
