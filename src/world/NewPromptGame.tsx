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
import { recipes } from './recipes';
import type { PromptWorld } from './world-schema';

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
  useEffect(() => () => active.current?.abort(), []);

  if (playing && soundtrack) return <GameSession world={playing} initial={null} initialSoundtrack={soundtrack} />;

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
    let plan: unknown;
    try {
      if (useGemini) {
        const response = await fetch('/api/scene-plan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, fictional: true }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(21_000)]),
        });
        if (!response.ok) throw new Error(response.status === 429 ? 'Gemini is busy or has reached its quota.' : 'Gemini could not complete this scene.');
        plan = await response.json();
        if (plan === null || typeof plan !== 'object') throw new Error('Gemini returned an invalid scene specification.');
        if (controller.signal.aborted) return;
        setPhase('building');
      }
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      if (controller.signal.aborted) return;
      const built = composeSceneTemplate(prompt, { id: crypto.randomUUID(), plan, processing: useGemini ? 'gemini' : 'private' });
      if (useGemini && !built.ok) throw new Error(built.reason);
      const next = story ? withMemoryStory(built) : built;
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
    <section className="intake prompt-game">
      <h1>New game from a prompt</h1>
      <p>Describe a place to explore. Build a memory to meet a fictional character after two discoveries, or build a world to end your walk at a landmark.</p>
      <form onSubmit={event => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        if (!phase) void generate(!(submitter instanceof HTMLButtonElement && submitter.value === 'world'), fictional);
      }}>
        <label htmlFor={inputId}>Describe the world</label>
        <textarea ref={input} id={inputId} value={prompt} rows={4} placeholder={EXAMPLE}
          onChange={event => edit(event.target.value)} aria-describedby="prompt-hint" />
        <p className="field-hint" id="prompt-hint">{promptLength(prompt)} / {PROMPT_MAX} · A place name is enough. Add objects, weather, or where things belong to shape the visit.</p>
        <div className="prompt-actions" aria-label="Fill with an example">
          {['park', 'water park'].map(example => <button key={example} type="button" onClick={() => { edit(example); input.current?.focus(); }}>{example}</button>)}
        </div>
        {import.meta.env.DEV && (
          <label className="story-consent">
            <input type="checkbox" checked={fictional} onChange={event => { clear(); setFictional(event.target.checked); }} />
            Send this fictional prompt to Google Gemini. Use invented details only.
          </label>
        )}
        <p className="field-hint">Processing · {fictional ? 'Gemini scene planner' : 'Private on this device'}</p>
        <div className="prompt-actions">
          <button type="submit" disabled={Boolean(phase)}>Build memory</button>
          <button type="submit" value="world" disabled={Boolean(phase)}>Build world</button>
        </div>
      </form>
      {phase && <p role="status">{phase === 'planning' ? 'Planning the scene with Gemini…' : 'Building the scene and checking the route…'}</p>}
      {failed && (
        <div className="prompt-result">
          <p role="alert">{failed.reason}</p>
          <div className="prompt-actions">
            <button type="button" onClick={() => void generate(failed.story, fictional)}>Try again</button>
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
          <p role="status">{scene?.processing === 'gemini' ? 'Planned with Gemini' : 'Built privately'}</p>
          {result.world.story && <p>{result.world.story.place} · {result.world.story.mood} · Written locally</p>}
          <p><strong>In the scene</strong> {features.join(', ')}</p>
          {scene && scene.coverage.some(item => item.status !== 'placed') && (
            <ul aria-label="Substitutions and missing features">
              {scene.coverage.filter(item => item.status !== 'placed').map(item =>
                <li key={item.feature}>{scene.plan.intent.features[item.feature].phrase} · {item.status} · {item.reason}</li>)}
            </ul>
          )}
          {result.world.interpretation.relations.some(relation => relation.status === 'unsupported') && (
            <p>Some requested positions could not be matched. Try changing the relationship or naming additional space around the object.</p>
          )}
          <details><summary>World interpretation</summary>
            <InterpretationPanel prompt={result.world.prompt} interpretation={result.world.interpretation} />
          </details>
          <WorldSoundtrack value={soundtrack} onActiveAudio={ignoreAudio}
            onChange={choice => setSoundtrack({ ...choice, muted: soundtrack.muted })}
            mute={{ value: soundtrack.muted, onChange: muted => setSoundtrack({ ...soundtrack, muted }) }} />
          <div className="prompt-actions">
            <button type="button" onClick={() => setPlaying(result.world)}>Enter world</button>
            <button type="button" onClick={() => { clear(); input.current?.focus(); }}>Revise prompt</button>
          </div>
        </div>
      )}
    </section>
  );
}
