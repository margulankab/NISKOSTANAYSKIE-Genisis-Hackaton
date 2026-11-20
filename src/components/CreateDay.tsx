import { useRef, useState } from 'react';
import type { Draft } from '../App';
import { interpretDay } from '../lib/mood';
import { embedUrl, parseSpotify } from '../lib/spotify';
import { toThumb } from '../lib/storage';
import type { SavedWorld } from '../lib/types';

const MAX_BYTES = 40 * 1024 * 1024;

export function CreateDay({ draft, setDraft, onBack, onImagined }: { draft: Draft; setDraft: (d: Draft) => void; onBack: () => void; onImagined: (w: SavedWorld) => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const spotify = draft.spotifyInput.trim() ? parseSpotify(draft.spotifyInput) : null;
  const spotifyBad = draft.spotifyInput.trim() !== '' && !spotify;
  const words = draft.text.trim().split(/\s+/).filter(Boolean).length;

  async function addFiles(files: FileList | null) {
    if (!files) return; setErr(null);
    const next = [...draft.media];
    for (const f of Array.from(files)) {
      const kind = f.type.startsWith('image/') ? 'photo' : f.type.startsWith('video/') ? 'video' : null;
      if (!kind) { setErr(`“${f.name}” isn’t a photo or video I can use.`); continue; }
      if (f.size > MAX_BYTES) { setErr(`“${f.name}” is larger than 40 MB.`); continue; }
      if (next.filter((m) => m.kind === kind).length >= 1) { setErr(`One ${kind} per world for now — remove the current one to swap it.`); continue; }
      next.push({ kind, name: f.name, preview: URL.createObjectURL(f), thumb: await toThumb(f) });
    }
    setDraft({ ...draft, media: next }); if (fileRef.current) fileRef.current.value = '';
  }
  function remove(i: number) { URL.revokeObjectURL(draft.media[i].preview); setDraft({ ...draft, media: draft.media.filter((_, j) => j !== i) }); }

  function imagine() {
    setErr(null);
    if (words < 3) { setErr('Write a few words about your day first — even one honest sentence works.'); return; }
    if (spotifyBad) { setErr('That doesn’t look like a Spotify track link. Paste a link like open.spotify.com/track/… or a spotify:track:… URI, or clear the field.'); return; }
    setBusy(true);
    const media = draft.media.map((m) => ({ kind: m.kind, image: m.thumb ?? undefined }));
    const config = interpretDay({ text: draft.text, media, hasMusic: !!spotify });
    const noThumb = draft.media.some((m) => !m.thumb);
    onImagined({
      id: `w${Date.now().toString(36)}${config.seed.toString(36)}`, createdAt: Date.now(), text: draft.text.trim(), spotify, config,
      mediaNote: noThumb ? 'One of your files couldn’t be previewed, so it was left out of the world.' : undefined,
    });
  }

  return (
    <section className="create">
      <button className="btn link" onClick={onBack}>← Back</button>
      <header><p className="eyebrow">Step 1 of 3 · Today’s page</p><h2>What was today like?</h2></header>
      <div className="journal">
        <label htmlFor="day" className="sr-only">Describe your day</label>
        <textarea id="day" value={draft.text} maxLength={1500} placeholder="I woke up late, walked to the park, had tea with Anna, and the light on the water was unreal…" onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        <div className="count" aria-live="polite">{words} words · {draft.text.length}/1500</div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Photo or video <span className="opt">optional</span></h3>
          <p className="hint">Becomes a framed picture in your house. For video, a still frame is used.</p>
          <input ref={fileRef} id="media" type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
          <label htmlFor="media" className="btn ghost small" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}>+ Choose a file</label>
          <ul className="previews">
            {draft.media.map((m, i) => (
              <li key={m.preview}>
                {m.kind === 'photo' ? <img src={m.preview} alt={`Preview of ${m.name}`} /> : <video src={m.preview} muted playsInline controls aria-label={`Preview of ${m.name}`} />}
                <span className="tag">{m.kind === 'photo' ? 'Photo' : 'Video'}</span>
                <button className="x" onClick={() => remove(i)} aria-label={`Remove ${m.name}`}>✕</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>A song from today <span className="opt">optional</span></h3>
          <p className="hint">Paste a Spotify link or URI. It plays in Spotify’s own official player.</p>
          <label htmlFor="sp" className="sr-only">Spotify track link or URI</label>
          <input id="sp" type="text" inputMode="url" placeholder="https://open.spotify.com/track/…" value={draft.spotifyInput} aria-invalid={spotifyBad} aria-describedby="sp-msg" onChange={(e) => { setShowPlayer(false); setDraft({ ...draft, spotifyInput: e.target.value }); }} />
          <p id="sp-msg" className={'msg ' + (spotifyBad ? 'bad' : spotify ? 'good' : '')} role="status">
            {spotifyBad ? '✕ Not a recognised Spotify link.' : spotify ? `✓ Spotify ${spotify.kind} recognised.` : 'Search isn’t available in this prototype — links only.'}
          </p>
          {spotify && !showPlayer && <button className="btn ghost small" onClick={() => setShowPlayer(true)}>Load Spotify player to preview</button>}
          {spotify && showPlayer && <iframe title="Spotify player preview" src={embedUrl(spotify)} width="100%" height="80" allow="encrypted-media" loading="lazy" style={{ border: 0, borderRadius: 12 }} />}
        </div>
      </div>

      <aside className="notice"><strong>Where your data goes.</strong> Your text and picture stay in this browser (local storage). The mood is worked out on your device with simple rules — no AI model is called. Spotify’s player, only if you load it, talks to Spotify.</aside>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row"><button className="btn primary" disabled={busy} onClick={imagine}>Imagine this day ✦</button></div>
    </section>
  );
}
