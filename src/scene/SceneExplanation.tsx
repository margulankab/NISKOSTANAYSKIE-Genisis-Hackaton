import type { MemoryScene } from '../shared/memory-schema';
import { environmentDetails } from './scene-style';
import type { SceneStyle } from './scene-style';

const treatments: Record<SceneStyle['treatment'], string> = {
  angular: 'Angled mounts give the tense composition sharper edges.',
  collage: 'Layered photo mounts give the composition a collage treatment.',
  soft: 'Straight mounts and softer lighting keep the composition open.',
};

const percent = (value: number) => Math.round(value * 100) + '%';

function SoundtrackExplanation({ rule }: { rule: MemoryScene['presentation']['appliedRules'][1] }) {
  return (
    <div>
      <dt>Soundtrack motion</dt>
      <dd>
        Measured audio energy {percent(rule.source.meanEnergy)} sets movement to {rule.result.motionSpeed.toFixed(3)} cycles per second.
        {' '}During playback, peaks in measured energy move the artifacts and increase their scale by up to {percent(rule.result.pulseGain)}.
      </dd>
    </div>
  );
}

export function SceneExplanation({ manifest, style, generated = false }: {
  manifest: MemoryScene;
  style: SceneStyle;
  generated?: boolean;
}) {
  const [photo, music, mood] = manifest.presentation.appliedRules;
  const environment = environmentDetails[style.environment];

  return (
    <details className="scene-explanation">
      <summary>Why this scene?</summary>
      <dl>
        <div>
          <dt>Setting</dt>
          <dd>{generated ? 'Objects, terrain, and their placement come from details in your journal.'
            : `${environment.name}. ${environment.description}`}</dd>
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
          <dt>{generated ? 'Soundtrack motion' : 'Mood and composition'}</dt>
          {generated ? (
            <dd>Measured audio energy {percent(music.source.meanEnergy)} changes the light during playback.</dd>
          ) : <dd>
            Warmth {percent(mood.result.lightWarmth)} sets the key light color. Tension {percent(mood.source.tension)}
            {' '}and measured audio energy {percent(music.source.meanEnergy)} set the mounts
            {' '}{mood.result.artifactSpacing.toFixed(2)} scene units apart.
            {' '}{treatments[style.treatment]}
          </dd>}
        </div>
        {!generated && <SoundtrackExplanation rule={music} />}
      </dl>
    </details>
  );
}
