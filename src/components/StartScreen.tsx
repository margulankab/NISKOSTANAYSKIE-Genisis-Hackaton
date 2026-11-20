import { loadWorlds } from '../lib/storage';

export function StartScreen({ onCreate, onSaved }: { onCreate: () => void; onSaved: () => void }) {
  const count = loadWorlds().worlds.length;
  return (
    <section className="start">
      <div className="hero-art" aria-hidden="true">
        <div className="moon" /><div className="house"><i className="roof" /><i className="win w1" /><i className="win w2" /><i className="door" /></div>
        {Array.from({ length: 14 }, (_, i) => <b key={i} className="mote" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.7) % 6}s`, animationDuration: `${7 + (i % 5)}s` }} />)}
      </div>
      <div className="start-copy">
        <p className="eyebrow">A small game about a whole day</p>
        <h1>Memory <em>Worlds</em></h1>
        <p className="lede">Tell us about today. Gather its fragments into a memory box, close the lid, and watch an ordinary house become the world your day felt like.</p>
        <div className="row">
          <button className="btn primary" onClick={onCreate}>Create today’s world <span aria-hidden="true">→</span></button>
          <button className="btn ghost" onClick={onSaved}>Saved worlds{count > 0 && <span className="badge" aria-label={`${count} saved`}>{count}</span>}</button>
        </div>
        <p className="fine">Everything stays in your browser. No account, no upload.</p>
      </div>
    </section>
  );
}
