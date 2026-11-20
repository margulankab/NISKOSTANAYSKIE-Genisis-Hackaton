import { PRESETS } from '../lib/presets';
import type { SavedWorld } from '../lib/types';

const SWATCHES: [string, keyof SavedWorld['config']['palette']][] = [['Sky', 'sky'], ['Walls', 'wall'], ['Floor', 'floor'], ['Accent', 'accent'], ['Glow', 'glow']];

export function MoodReview({ world, onEdit, onEnter }: { world: SavedWorld; onEdit: () => void; onEnter: () => void }) {
  const c = world.config; const preset = PRESETS[c.moodId];
  return (
    <section className="review">
      <p className="eyebrow">Step 2 of 3 · How the day reads</p>
      <h2 className="big-title">{c.title}</h2>
      <div className="mood-chip"><span aria-hidden="true" className="glyph">{preset.glyph}</span><span><strong>{c.moodLabel}</strong> — {preset.blurb}</span></div>
      <div className="grid2">
        <div className="card"><h3>World</h3><p>{c.environment}</p>
          <h3>Motifs</h3><ul className="chips">{c.motifs.map((m) => <li key={m}>{m}</li>)}</ul></div>
        <div className="card"><h3>Palette</h3>
          <ul className="swatches">{SWATCHES.map(([n, k]) => <li key={k}><i style={{ background: c.palette[k] }} aria-hidden="true" /><span>{n}<small>{c.palette[k]}</small></span></li>)}</ul></div>
      </div>
      <div className="card"><h3>Fragments you’ll gather</h3>
        <ul className="frags">{c.fragments.map((f) => <li key={f.id}><span className="tag">{f.kind === 'text' ? 'From your words' : f.kind === 'photo' ? 'Picture' : 'Music'}</span> {f.caption}</li>)}</ul></div>
      <p className="notice small"><strong>Local rules, not AI.</strong> This reading came from simple keyword rules and hand-made presets running in your browser; no AI model was used. It’s an artistic interpretation, not a diagnosis.</p>
      {world.mediaNote && <p className="error">{world.mediaNote}</p>}
      <div className="row"><button className="btn ghost" onClick={onEdit}>← Edit my entry</button><button className="btn primary" onClick={onEnter}>Enter the house →</button></div>
    </section>
  );
}
