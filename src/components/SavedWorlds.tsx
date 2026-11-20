import { useState } from 'react';
import { deleteWorld, loadWorlds } from '../lib/storage';
import { PRESETS } from '../lib/presets';
import type { SavedWorld } from '../lib/types';

export function SavedWorlds({ onBack, onOpen }: { onBack: () => void; onOpen: (w: SavedWorld) => void }) {
  const [res, setRes] = useState(loadWorlds());
  return (
    <section className="saved">
      <button className="btn link" onClick={onBack}>← Back</button>
      <h2>Saved worlds</h2>
      {!res.ok && <p className="error" role="alert">{res.error}</p>}
      {res.ok && res.worlds.length === 0 && <div className="empty"><p className="big-title small">Nothing here yet.</p><p>Worlds you create are kept on this device and will appear here.</p><button className="btn primary" onClick={onBack}>Create your first world</button></div>}
      <ul className="cards">
        {res.worlds.map((w) => { const p = PRESETS[w.config.moodId]; const thumb = w.config.fragments.find((f) => f.image)?.image; return (
          <li key={w.id} className="wcard" style={{ ['--a' as string]: w.config.palette.accent, ['--s' as string]: w.config.palette.sky }}>
            <div className="wthumb" style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}><span className="glyph" aria-hidden="true">{p.glyph}</span></div>
            <h3>{w.config.title}</h3>
            <p className="hint">{w.config.moodLabel} · {new Date(w.createdAt).toLocaleDateString()}</p>
            <p className="excerpt">{w.text.slice(0, 90)}{w.text.length > 90 ? '…' : ''}</p>
            <div className="row"><button className="btn primary small" onClick={() => onOpen(w)}>Open world</button>
              <button className="btn ghost small" onClick={() => { if (confirm('Delete this world from this device?')) { deleteWorld(w.id); setRes(loadWorlds()); } }} aria-label={`Delete ${w.config.title}`}>Delete</button></div>
          </li>); })}
      </ul>
    </section>
  );
}
