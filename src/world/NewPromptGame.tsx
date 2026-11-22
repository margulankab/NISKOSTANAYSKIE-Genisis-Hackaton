import { useEffect, useId, useRef, useState } from 'react';
import type { SoundtrackChoice } from '../media/world-soundtrack';
import { WorldSoundtrack } from '../scene/WorldSoundtrack';
import { withMemoryStory } from './compose-memory-story';
import { composeSceneTemplate } from './compose-scene-template';
import type { ComposeResult } from './compose-world';
import { GameSession } from './GameSession';
import { InterpretationPanel } from './InterpretationPanel';
import { PROMPT_MAX, promptLength, promptSchema } from './layout-schema';
import { promptSoundtrack } from './prompt-soundtrack';
import { mentionsPerson } from './compose-memory-story';
import { requestPlotWorld } from './request-plot-world';
import { SceneDirectionDetails } from './SceneDirectionDetails';
import { recipes } from './recipes';
import type { PromptWorld } from './world-schema';
import { SongOfTheDay } from '../music/SongOfTheDay';
import type { Song } from '../music/song';
import { useT } from '../i18n/i18n';
import { enterWorld } from '../chrome/immersive';
import { readSettings } from '../menus/settings';

const ignoreAudio = () => {};
const EXAMPLE = 'At dusk I met Mira by a lighthouse in a foggy cove. A red rowboat was beside the pier and a lantern was on the shore.';

export function NewPromptGame() {
  const inputId = useId();
  const active = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [playing, setPlaying] = useState<PromptWorld | null>(null);
  const [soundtrack, setSoundtrack] = useState<SoundtrackChoice | null>(null);
  const [fictional, setFictional] = useState(false);
  const [phase, setPhase] = useState<'planning' | 'building' | null>(null);
  const [failed, setFailed] = useState<{ story: boolean; reason: string } | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const t = useT();
  useEffect(() => () => active.current?.abort(), []);

  if (playing && soundtrack) return <GameSession world={playing} initial={null} initialSoundtrack={soundtrack} autoStart={autoStart} />;

  function enter(world: PromptWorld, track: SoundtrackChoice) {
    const music = track.record.kind === 'silent' ? null : track.record;
    enterWorld({
      words: world.prompt, title: world.title, from: input.current,
      lines: [
        t('reading your words'),
        t('placing {count} objects', { count: world.layout.placements.length }),
        music ? t('tuning soundtrack: {track}', { track: music.title }) : t('silence, by choice'),
        t('opening the world'),
      ],
    });
    setAutoStart(readSettings().autoplay && !track.muted);
    setPlaying(world);
  }

  function clear() {
    active.current?.abort();
    active.current = null;
    setPhase(null);
    setResult(null);
    setSoundtrack(null);
    setFailed(null);
  }

  function edit(value: string) {
    clear();
    setPrompt(value);
    setFictional(false);
  }

  async function generate(story: boolean, useGemini: boolean) {
    clear();
    const checked = promptSchema.safeParse(prompt);
    if (!checked.success) {
      setResult({ ok: false, reason: checked.error.issues[0].message, interpretation: null });
      input.current?.focus();
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setPhase(useGemini ? 'planning' : 'building');
    try {
      let built: ComposeResult;
      if (useGemini) {
        // Gemini stages the whole visit: the plot's playable moments, the scene direction, and where things stand.
        built = { ok: true, world: await requestPlotWorld(checked.data, crypto.randomUUID(), controller.signal) };
        if (controller.signal.aborted) return;
      } else {
        await new Promise<void>(resolve => window.setTimeout(resolve, 0));
        if (controller.signal.aborted) return;
        built = composeSceneTemplate(prompt, { id: crypto.randomUUID(), processing: 'private' });
      }
      const storied = story && !(built.ok && built.world.layout.plot) ? withMemoryStory(built) : built;
      const next = storied.ok && song ? { ...storied, world: { ...storied.world, song } } : storied;
      setResult(next);
      if (next.ok) setSoundtrack(promptSoundtrack(next.world));
    } catch (error) {
      if (controller.signal.aborted) return;
      const reason = error instanceof DOMException && error.name === 'TimeoutError'
        ? 'Gemini exceeded its planning time.' : error instanceof Error ? error.message : 'Scene planning was unavailable.';
      setFailed({ story, reason });
    } finally {
      if (active.current === controller) {
        active.current = null;
        setPhase(null);
      }
    }
  }

  const scene = result?.ok ? result.world.scene : null;
  const features = result?.ok ? [...new Set(result.world.layout.placements.map(({ recipe }) => recipes[recipe].label))] : [];
  return (
    <section className="intake prompt-game" data-win="prompt_world.exe">
      <h1>{t('New game from a prompt')}</h1>
      <p>{t('Describe a place, or a day. Your words become a world with two discoveries and a small quest; mention someone you met and they will be waiting at the end.')}</p>
      <form onSubmit={event => {
        event.preventDefault();
        // One button: a person in the description ("I met Mira", "with my mom") brings a character and a conversation.
        if (!phase) void generate(mentionsPerson(prompt), fictional);
      }}>
        <label htmlFor={inputId}>{t('Describe the world')}</label>
        <textarea ref={input} id={inputId} value={prompt} rows={4} placeholder={EXAMPLE}
          onChange={event => edit(event.target.value)} aria-describedby="prompt-hint" />
        <p className="field-hint" id="prompt-hint">{promptLength(prompt)} / {PROMPT_MAX} · {t('A place name is enough. Add objects, weather, or where things belong to shape the visit.')}</p>
        <div className="prompt-actions" aria-label={t('Fill with an example')}>
          {['park', 'water park'].map(example => <button key={example} type="button" onClick={() => { edit(example); input.current?.focus(); }}>{t(example)}</button>)}
          <button type="button" onClick={() => {
            edit('At dusk I hit my first home run. Dad watched the ball clear the fence, then we celebrated together.');
            setFictional(true);
            input.current?.focus();
          }}>{t('First home run')}</button>
        </div>
        {import.meta.env.DEV && (
          <label className="story-consent">
            <input type="checkbox" checked={fictional} onChange={event => { clear(); setFictional(event.target.checked); }} />
            Send this fictional prompt to Google Gemini. Use invented details only.
          </label>
        )}
        <SongOfTheDay value={song} onChange={value => { clear(); setSong(value); }} />
        <p className="field-hint">{t('Processing')} · {fictional ? 'Gemini scene planner' : t('Private on this device')}</p>
        <div className="prompt-actions">
          <button type="submit" className="build-button" disabled={Boolean(phase)}>{t('Build world')}</button>
        </div>
      </form>
      {phase && <p role="status">{phase === 'planning' ? t('Writing the plot and checking the route…') : t('Building the scene and checking the route…')}</p>}
      {failed && (
        <div className="prompt-result">
          <p role="alert">{failed.reason}</p>
          <div className="prompt-actions">
            <button type="button" onClick={() => void generate(failed.story, fictional)}>{t('Try again')}</button>
            {fictional && <button type="button" onClick={() => { setFictional(false); void generate(failed.story, false); }}>Build privately</button>}
          </div>
        </div>
      )}
      {result && !result.ok && (
        <div className="prompt-result">
          <p role="alert">{result.reason}</p>
          {result.interpretation && <InterpretationPanel prompt={prompt} interpretation={result.interpretation} />}
        </div>
      )}
      {result?.ok && soundtrack && (
        <div className="prompt-result">
          <h2>{result.world.title}</h2>
          <p role="status">{scene?.processing === 'gemini' ? t('Planned with Gemini') : t('Built privately')}</p>
          {result.world.layout.plot && <p className="plot-opening">{result.world.layout.plot.opening}</p>}
          {result.world.story && <p>{result.world.story.place} · {result.world.story.mood} · {t('Written locally')}</p>}
          <p><strong>{t('In the scene')}</strong> {features.join(', ')}</p>
          {scene && scene.coverage.some(item => item.status !== 'placed') && (
            <ul aria-label="Substitutions and missing features">
              {scene.coverage.filter(item => item.status !== 'placed').map(item =>
                <li key={item.feature}>{scene.plan.intent.features[item.feature].phrase} · {item.status} · {item.reason}</li>)}
            </ul>
          )}
          {result.world.interpretation.relations.some(relation => relation.status === 'unsupported') && (
            <p>Some requested positions could not be matched. Try changing the relationship or naming additional space around the object.</p>
          )}
          {result.world.layout.direction && <SceneDirectionDetails direction={result.world.layout.direction}
            interpretation={result.world.interpretation} prompt={result.world.prompt} soundtrack={soundtrack} song={Boolean(result.world.song)} />}
          <details><summary>{t('World interpretation')}</summary>
            <InterpretationPanel prompt={result.world.prompt} interpretation={result.world.interpretation} />
          </details>
          <WorldSoundtrack value={soundtrack} onActiveAudio={ignoreAudio}
            onChange={choice => setSoundtrack({ ...choice, muted: soundtrack.muted })}
            mute={{ value: soundtrack.muted, onChange: muted => setSoundtrack({ ...soundtrack, muted }) }} />
          <div className="prompt-actions">
            <button type="button" className="enter-world" onClick={() => enter(result.world, soundtrack)}>{t('Enter world')}</button>
            <button type="button" onClick={() => { clear(); input.current?.focus(); }}>{t('Revise prompt')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
