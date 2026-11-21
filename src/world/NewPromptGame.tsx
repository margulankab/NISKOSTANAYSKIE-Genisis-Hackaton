import { WorldSoundtrack } from '../scene/WorldSoundtrack';
import type { SoundtrackChoice } from '../media/world-soundtrack';
import { promptSoundtrack } from './prompt-soundtrack';
import { useId, useState } from 'react';
import { composeWorld } from './compose-world';
import type { ComposeResult } from './compose-world';
import { composeMemoryStory } from './compose-memory-story';
import { GameSession } from './GameSession';
import { InterpretationPanel } from './InterpretationPanel';
import { PROMPT_MAX, promptSchema } from './world-schema';
import type { PromptWorld } from './world-schema';

const ignoreAudio = () => {};
const EXAMPLE = 'At dusk I met Mira by a lighthouse in a foggy cove. A red rowboat was beside the pier and a lantern was on the shore.';

/** New Game → From a prompt, with a preview before entering. */
export function NewPromptGame() {
  const inputId = useId();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [playing, setPlaying] = useState<PromptWorld | null>(null);
  const [soundtrack, setSoundtrack] = useState<SoundtrackChoice | null>(null);
  const [fictional, setFictional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  if (playing && soundtrack) return <GameSession world={playing} initial={null} initialSoundtrack={soundtrack} />;

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const id = crypto.randomUUID();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const story = !(submitter instanceof HTMLButtonElement && submitter.value === 'world');
    const useGemini = import.meta.env.DEV && story && fictional && promptSchema.safeParse(prompt).success;
    setResult(null);
    setNotice('');
    let modelOutput: unknown;
    if (useGemini) {
      setBusy(true);
      try {
        const response = await fetch('/api/memory-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, fictional: true }),
          signal: AbortSignal.timeout(22_000),
        });
        if (response.ok) modelOutput = await response.json();
      } catch {
        // The local story uses the same input if the optional service is unavailable.
      } finally {
        setBusy(false);
      }
    }
    const next = story ? composeMemoryStory(prompt, id, modelOutput) : composeWorld(prompt, { id });
    if (useGemini && (!next.ok || next.world.story?.source !== 'gemini')) {
      setNotice(next.ok ? 'Gemini was unavailable or returned an incompatible scene. This memory was generated locally.'
        : 'Gemini did not produce a playable scene. You can revise your prompt below.');
    }
    setResult(next);
    setSoundtrack(next.ok ? promptSoundtrack(next.world) : null);
  }

  return (
    <section className="intake prompt-game">
      <h1>New game from a prompt</h1>
      <p>Describe a place, a person, and a detail you remember. Walk the scene, explore two objects, and share a short imagined conversation.</p>
      <form onSubmit={generate}>
        <label htmlFor={inputId}>Describe the world</label>
        <textarea id={inputId} value={prompt} disabled={busy} maxLength={PROMPT_MAX} rows={4} placeholder={EXAMPLE}
          onChange={(event) => { setPrompt(event.target.value); setResult(null); setFictional(false); setNotice(''); }} />
        <p className="field-hint">{prompt.length} / {PROMPT_MAX} · Try places, objects, counts, colors, time, weather and words like “beside” or “beyond”.</p>
        <div className="prompt-actions">
          <button type="submit" disabled={busy}>Build memory</button>
          <button type="submit" value="world" disabled={busy}>Build world</button>
        </div>
        {import.meta.env.DEV && (
          <label className="story-consent">
            <input type="checkbox" checked={fictional} disabled={busy} onChange={(event) => setFictional(event.target.checked)} />
            Send this fictional prompt to Google Gemini. Use invented details only. Leave unchecked for private memories.
          </label>
        )}
      </form>
      {busy && <p role="status">Writing the memory…</p>}
      {notice && <p role="status">{notice}</p>}
      {result && !result.ok && (
        <div className="prompt-result">
          <p role="alert">{result.reason}</p>
          {result.interpretation && <InterpretationPanel prompt={prompt} interpretation={result.interpretation} />}
        </div>
      )}
      {result?.ok && soundtrack && (
        <div className="prompt-result">
          <h2>{result.world.title}</h2>
          {result.world.story && (
            <p>{result.world.story.place} · {result.world.story.mood} · {result.world.story.source === 'gemini' ? 'Written with Gemini' : 'Written locally'}</p>
          )}
          <InterpretationPanel prompt={result.world.prompt} interpretation={result.world.interpretation} />
          <WorldSoundtrack value={soundtrack} onActiveAudio={ignoreAudio}
            onChange={(choice) => setSoundtrack({ ...choice, muted: soundtrack.muted })}
            mute={{ value: soundtrack.muted, onChange: (muted) => setSoundtrack({ ...soundtrack, muted }) }} />
          <div className="prompt-actions">
            <button type="button" onClick={() => setPlaying(result.world)}>Enter world</button>
            <button type="button" onClick={() => setResult(null)}>Revise prompt</button>
          </div>
        </div>
      )}
    </section>
  );
}
