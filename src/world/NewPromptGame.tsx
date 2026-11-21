import { useId, useState } from 'react';
import { composeWorld } from './compose-world';
import type { ComposeResult } from './compose-world';
import { GameSession } from './GameSession';
import { InterpretationPanel } from './InterpretationPanel';
import { PROMPT_MAX } from './world-schema';
import type { PromptWorld } from './world-schema';

const EXAMPLE = 'A lighthouse above a foggy cove with a red rowboat beside a pier.';

/** New Game → From a prompt: text only, generated locally, with a preview before entering. */
export function NewPromptGame() {
  const inputId = useId();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [playing, setPlaying] = useState<PromptWorld | null>(null);

  if (playing) return <GameSession world={playing} initial={null} saved={false} />;

  function generate(event: React.FormEvent) {
    event.preventDefault();
    setResult(composeWorld(prompt, { id: crypto.randomUUID() }));
  }

  return (
    <section className="intake prompt-game">
      <h1>New game from a prompt</h1>
      <p>Describe a place. The world is built in this browser from a set of low-poly builders. Nothing is sent anywhere.</p>
      <form onSubmit={generate}>
        <label htmlFor={inputId}>Describe the world</label>
        <textarea id={inputId} value={prompt} maxLength={PROMPT_MAX} rows={4} placeholder={EXAMPLE}
          onChange={(event) => { setPrompt(event.target.value); setResult(null); }} />
        <p className="field-hint">{prompt.length} / {PROMPT_MAX} · Try places, objects, counts, colors, time, weather and words like “beside” or “beyond”.</p>
        <button type="submit">Build world</button>
      </form>
      {result && !result.ok && (
        <div className="prompt-result">
          <p role="alert">{result.reason}</p>
          {result.interpretation && <InterpretationPanel prompt={prompt} interpretation={result.interpretation} />}
        </div>
      )}
      {result?.ok && (
        <div className="prompt-result">
          <h2>{result.world.title}</h2>
          <InterpretationPanel prompt={result.world.prompt} interpretation={result.world.interpretation} />
          <div className="prompt-actions">
            <button type="button" onClick={() => setPlaying(result.world)}>Enter world</button>
            <button type="button" onClick={() => setResult(null)}>Revise prompt</button>
          </div>
        </div>
      )}
    </section>
  );
}
