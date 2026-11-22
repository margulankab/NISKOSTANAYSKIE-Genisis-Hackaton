import { composeSceneTemplate } from './compose-scene-template';
import { withMemoryStory, mentionsPerson } from './compose-memory-story';
import { enterWorld } from '../chrome/immersive';
import { useEffect, useId, useRef, useState } from 'react';
import type { SoundtrackChoice } from '../media/world-soundtrack';
import { WorldSoundtrack } from '../scene/WorldSoundtrack';
import { GameSession } from './GameSession';
import { SceneDirectionDetails } from './SceneDirectionDetails';
import { InterpretationPanel } from './InterpretationPanel';
import { PROMPT_MAX, promptLength, promptSchema } from './layout-schema';
import { promptSoundtrack } from './prompt-soundtrack';
import { requestPlotWorld } from './request-plot-world';
import { recipes } from './recipes';
import type { PromptWorld } from './world-schema';
import { SongOfTheDay } from '../music/SongOfTheDay';
import type { Song } from '../music/song';

const ignoreAudio = () => {};
const EXAMPLE = 'At dusk I met Mira by a lighthouse in a foggy cove. A red rowboat was beside the pier and a lantern was on the shore.';

export function NewPromptGame() {
  const inputId = useId();
  const active = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<PromptWorld | null>(null);
  const [playing, setPlaying] = useState<PromptWorld | null>(null);
  const [soundtrack, setSoundtrack] = useState<SoundtrackChoice | null>(null);
  const [fictional, setFictional] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState('');
  const [song, setSong] = useState<Song | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  if (playing && soundtrack) return <GameSession world={playing} initial={null} initialSoundtrack={soundtrack} />;

  function clear() {
    active.current?.abort();
    active.current = null;
    setPending(false);
    setResult(null);
    setSoundtrack(null);
    setFailure('');
  }

  function edit(value: string) {
    clear();
    setPrompt(value);
    setFictional(false);
  }

  async function generate() {
    clear();
    const checked = promptSchema.safeParse(prompt);
    if (!checked.success) {
      setFailure(checked.error.issues[0].message);
      input.current?.focus();
      return;
    }
    if (!fictional) { setFailure('Confirm the prompt contains fictional details before sending it to Gemini.'); return; }
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    try {
      const built = await requestPlotWorld(checked.data, crypto.randomUUID(), controller.signal);
      const next = song ? { ...built, song } : built;
      setResult(next);
      setSoundtrack(promptSoundtrack(next));
    } catch (error) {
      if (controller.signal.aborted) return;
      setFailure(error instanceof Error ? error.message : 'Scene planning is unavailable.');
    } finally {
      if (active.current === controller) {
        active.current = null;
        setPending(false);
      }
    }
  }

  function buildPrivately() {
    clear();
    const composed = composeSceneTemplate(prompt, { id: crypto.randomUUID() });
    const built = mentionsPerson(prompt) ? withMemoryStory(composed) : composed;
    if (!built.ok) { setFailure(built.reason); return; }
    const world = song ? { ...built.world, song } : built.world;
    setResult(world);
    setSoundtrack(promptSoundtrack(world));
  }

  const scene = result?.scene;
  const features = result ? [...new Set(result.layout.placements.map(({ recipe }) => recipes[recipe].label))] : [];
  const gaps = scene?.coverage.filter(item => item.status !== 'placed'
    && (!result?.layout.direction || scene.plan.intent.features[item.feature].origin === 'requested')) ?? [];
  return (
    <section className="intake prompt-game" data-win="prompt_world.exe">
      <h1>New game from a prompt</h1>
      <p>Describe a fictional place or moment. Gemini will turn it into a visit you can play.</p>
      <form onSubmit={event => {
        event.preventDefault();
        if (!pending) void generate();
      }}>
        <label htmlFor={inputId}>Describe the world</label>
        <textarea ref={input} id={inputId} value={prompt} rows={4} placeholder={EXAMPLE}
          onChange={event => edit(event.target.value)} aria-describedby="prompt-hint" />
        <p className="field-hint" id="prompt-hint">{promptLength(prompt)} / {PROMPT_MAX} · A place name is enough. Add objects, weather, or where things belong to shape the visit.</p>
        <div className="prompt-actions" aria-label="Fill with an example">
          {['park', 'water park', 'First home run'].map(example => <button key={example} type="button" onClick={() => {
            edit(example === 'First home run' ? 'At dusk I hit my first home run. Dad watched the ball clear the fence, then we celebrated together.' : example);
            setFictional(true);
            input.current?.focus();
          }}>{example}</button>)}
        </div>
        <label className="story-consent">
          <input type="checkbox" checked={fictional} onChange={event => { clear(); setFictional(event.target.checked); }} />
          Send this fictional prompt to Google Gemini. Use invented details only.
        </label>
        <p className="field-hint">Google may use fictional submissions to improve its services. <a href="https://aistudio.google.com/docs/terms#data-use-unpaid" target="_blank" rel="noreferrer">Gemini terms</a></p>
        <SongOfTheDay value={song} onChange={value => { clear(); setSong(value); }} />
        <div className="prompt-actions">
          <button type="button" disabled={pending} onClick={buildPrivately}>Build privately</button>
          <button type="submit" disabled={pending}>Build world</button>
        </div>
      </form>
      {pending && <p role="status">Writing the plot and checking the route…</p>}
      {failure && (
        <div className="prompt-result">
          <p role="alert">{failure}</p>
          <div className="prompt-actions">
            {fictional && <button type="button" onClick={() => void generate()}>Try again</button>}
            <button type="button" onClick={() => input.current?.focus()}>Revise prompt</button>
          </div>
        </div>
      )}
      {result && soundtrack && (
        <div className="prompt-result">
          <h2>{result.title}</h2>
          <p role="status">{scene?.processing === 'gemini' ? 'Planned with Gemini' : 'Built privately'}</p>
          {result.layout.plot && <p>{result.layout.plot.opening}</p>}
          <p><strong>In the scene</strong> {features.join(', ')}</p>
          {scene && gaps.length > 0 && (
            <ul aria-label="Substitutions and missing features">
              {gaps.map(item =>
                <li key={item.feature}>{scene.plan.intent.features[item.feature].phrase} · {item.status} · {item.reason}</li>)}
            </ul>
          )}
          {result.interpretation.relations.some(relation => relation.status === 'unsupported') && (
            <p>Some requested positions could not be matched. Try changing the relationship or naming additional space around the object.</p>
          )}
          {result.layout.direction && <SceneDirectionDetails direction={result.layout.direction}
            interpretation={result.interpretation} prompt={result.prompt} soundtrack={soundtrack} song={Boolean(result.song)} />}
          <details><summary>World interpretation</summary>
            <InterpretationPanel prompt={result.prompt} interpretation={result.interpretation} />
          </details>
          <WorldSoundtrack value={soundtrack} onActiveAudio={ignoreAudio}
            onChange={choice => setSoundtrack({ ...choice, muted: soundtrack.muted })}
            mute={{ value: soundtrack.muted, onChange: muted => setSoundtrack({ ...soundtrack, muted }) }} />
          <div className="prompt-actions">
            <button type="button" onClick={() => {
              enterWorld({ title: result.title, words: result.prompt, lines: ['Opening the world'], from: input.current });
              setPlaying(result);
            }}>Enter world</button>
            <button type="button" onClick={() => { clear(); input.current?.focus(); }}>Revise prompt</button>
          </div>
        </div>
      )}
    </section>
  );
}
