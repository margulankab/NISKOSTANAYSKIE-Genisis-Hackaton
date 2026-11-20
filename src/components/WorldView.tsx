import { useEffect, useRef, useState } from 'react';
import { MemoryWorld, supportsWebGL, type Snapshot } from '../game/world';
import { saveWorld } from '../lib/storage';
import { embedUrl } from '../lib/spotify';
import type { SavedWorld } from '../lib/types';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function WorldView({ world, fresh, onExit }: { world: SavedWorld; fresh: boolean; onExit: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const eng = useRef<MemoryWorld | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [gl, setGl] = useState(true);
  const [save, setSave] = useState<{ ok: boolean; msg: string } | null>(fresh ? null : { ok: true, msg: 'Saved world' });
  const [player, setPlayer] = useState(false);
  const saved = useRef(!fresh);
  const c = world.config;

  useEffect(() => {
    if (!supportsWebGL()) { setGl(false); return; }
    const w = new MemoryWorld(host.current!, c, { transformed: !fresh, reducedMotion: reduced() });
    eng.current = w; if (import.meta.env.DEV) (window as unknown as { __mw: MemoryWorld }).__mw = w; setSnap(w.getSnapshot()); const off = w.onChange(setSnap);
    return () => { off(); w.dispose(); eng.current = null; };
  }, [c, fresh]);

  useEffect(() => {
    if (snap?.phase === 'explore' && !saved.current) {
      saved.current = true; const r = saveWorld(world);
      setSave(r.ok ? { ok: true, msg: 'World saved to this device' } : { ok: false, msg: r.error });
    }
  }, [snap?.phase, world]);

  if (!gl) return <section className="create"><button className="btn link" onClick={onExit}>← Back</button><h2>This browser can’t show 3D</h2><p className="error">WebGL isn’t available here. Try another browser or enable hardware acceleration. Your entry is still safe: “{c.title}”.</p></section>;

  const phase = snap?.phase ?? 'collect';
  const total = c.fragments.length;
  const musicInspect = snap?.inspecting?.kind === 'music';
  return (
    <section className="play" aria-label={`World: ${c.title}`}>
      <div className="canvas" ref={host} />
      <div className="hud top">
        <button className="btn ghost small" onClick={onExit}>← Menu</button>
        <div className="titlebar"><strong>{phase === 'explore' ? c.title : 'An ordinary house'}</strong><span>{snap?.room}</span></div>
        {phase === 'explore' && <span className={'pill ' + (save?.ok ? 'good' : 'bad')} role="status">{save?.msg}</span>}
      </div>

      {(phase === 'collect') && snap && (
        <aside className="hud quest" aria-label="Objectives">
          <h3>Gather today’s fragments</h3>
          <ol>{snap.frags.map((f) => <li key={f.id} className={f.status}><span className="check" aria-hidden="true">{f.status === 'placed' ? '✓' : f.status === 'carried' ? '●' : '○'}</span><span>{f.caption}<small>{f.room} · {f.status === 'placed' ? 'in the box' : f.status === 'carried' ? 'carrying — take it to the box' : 'waiting'}</small></span></li>)}</ol>
          <p className="hint">{snap.placed === 0 ? 'Walk to a glowing light and pick it up, then bring it to the box in the centre hall.' : 'When you’re ready, stand at the box with empty hands and close it.'}</p>
        </aside>
      )}
      {phase === 'explore' && snap && <aside className="hud quest slim" aria-live="polite"><strong>{c.moodLabel} · {c.environment}</strong><span>Memories seen {snap.seen}/{total}</span></aside>}

      {snap?.prompt && <div className="hud prompt" role="status"><kbd>E</kbd> {snap.prompt.replace('Press E — ', '')}</div>}
      {phase === 'closing' && <div className="hud banner" role="status">The lid closes…</div>}
      {phase === 'transforming' && <div className="hud banner" role="status">The house remembers…</div>}
      {phase === 'transforming' && <div className="veil" style={{ opacity: Math.max(0, 0.5 - Math.abs((snap?.transformT ?? 0) - 0.15) * 3) }} aria-hidden="true" />}

      <div className="hud controls" aria-label="Controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows move</span><span><kbd>Shift</kbd> hurry</span><span><kbd>E</kbd> interact</span><span><kbd>Esc</kbd> close</span>
        {phase === 'explore' && world.spotify && <button className="btn ghost small" onClick={() => setPlayer((v) => !v)} aria-expanded={player}>♪ Song</button>}</div>

      <Touch eng={eng} />

      {snap?.inspecting && (
        <div className="hud card-inspect" role="dialog" aria-modal="false" aria-label="Memory">
          {snap.inspecting.image && <img src={snap.inspecting.image} alt={snap.inspecting.caption} />}
          <blockquote>{snap.inspecting.kind === 'text' ? <>“{snap.inspecting.caption}”</> : snap.inspecting.caption}</blockquote>
          {musicInspect && !world.spotify && <p className="hint">No song was attached.</p>}
          {musicInspect && world.spotify && <MusicEmbed r={world.spotify} />}
          <button className="btn primary small" autoFocus onClick={() => eng.current?.closeInspect()}>Close</button>
        </div>
      )}
      {player && world.spotify && !musicInspect && <div className="hud player"><MusicEmbed r={world.spotify} /></div>}
    </section>
  );
}

function MusicEmbed({ r }: { r: NonNullable<SavedWorld['spotify']> }) {
  const [on, setOn] = useState(false);
  return on ? <iframe title="Spotify player" src={embedUrl(r)} width="100%" height="80" allow="encrypted-media" style={{ border: 0, borderRadius: 12 }} />
    : <div><p className="hint">This loads Spotify’s official player and contacts Spotify.</p><button className="btn ghost small" onClick={() => setOn(true)}>Load player</button></div>;
}

function Touch({ eng }: { eng: React.MutableRefObject<MemoryWorld | null> }) {
  const [on] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const knob = useRef<HTMLDivElement>(null);
  if (!on) return null;
  const move = (e: React.PointerEvent<HTMLDivElement>, end = false) => {
    const r = e.currentTarget.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), z = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; } if (end) { x = 0; z = 0; }
    if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${z * 34}px)`; eng.current?.setMove(Math.abs(x) < 0.15 ? 0 : x, Math.abs(z) < 0.15 ? 0 : z);
  };
  return (<>
    <div className="hud joy" role="group" aria-label="Movement joystick" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={(e) => e.buttons && move(e)} onPointerUp={(e) => move(e, true)} onPointerCancel={(e) => move(e, true)}><div ref={knob} className="knob" /></div>
    <button className="hud act" onClick={() => eng.current?.interact()} aria-label="Interact">E</button>
  </>);
}
