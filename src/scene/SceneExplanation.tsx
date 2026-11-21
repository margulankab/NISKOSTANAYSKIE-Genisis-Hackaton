import type { MemoryScene } from '../shared/memory-schema';
import { environmentDetails } from './scene-style';
import type { SceneStyle } from './scene-style';

const treatments: Record<SceneStyle['treatment'], string> = {
  angular: 'Angled mounts give the tense composition sharper edges.',
  collage: 'Layered photo mounts give the composition a collage treatment.',
  soft: 'Straight mounts and softer lighting keep the composition open.',
};

const percent = (value: number) => Math.round(value * 100) + '%';

export function SceneExplanation({ manifest, style }: { manifest: MemoryScene; style: SceneStyle }) {
  const [photo, music, mood] = manifest.presentation.appliedRules;
  const environment = environmentDetails[style.environment];

  return (
    <details className="scene-explanation">
      <summary>Why this scene?</summary>
      <dl>
        <div>
          <dt>Setting</dt>
          <dd>{environment.name}. {environment.description}</dd>
        </div>
        <div>
          <dt>Photo palette</dt>
          <dd>
            <ul className="scene-palette" aria-label="Photo accent colors">
              {photo.result.accentPalette.map(([r, g, b], index) => {
                const color = `rgb(${r}, ${g}, ${b})`;
                return <li key={index}><span aria-hidden="true" style={{ backgroundColor: color }} />{color}</li>;
              })}
            </ul>
            <span>Image brightness {percent(photo.result.photoLightness)} sets the ambient light level.</span>
          </dd>
        </div>
        <div>
          <dt>Mood and composition</dt>
          <dd>
            Warmth {percent(mood.result.lightWarmth)} sets the key light color. Tension {percent(mood.source.tension)}
            {' '}and measured audio energy {percent(music.source.meanEnergy)} set the mounts
            {' '}{mood.result.artifactSpacing.toFixed(2)} scene units apart.
            {' '}{treatments[style.treatment]}
          </dd>
        </div>
      </dl>
    </details>
  );
}
