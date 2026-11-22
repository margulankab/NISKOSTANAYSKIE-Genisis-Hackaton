import { useEffect, useState } from 'react';
import { useT } from '../i18n/i18n';
import { readSettings } from '../menus/settings';

export interface Moment {
  /** Changes for every new discovery, so the card replays. */
  id: string;
  /** How many discoveries are found now, this one included. */
  count: number;
  title: string;
  quote?: string;
  note?: string;
  photoUrl?: string;
}

const SHOWN_MS = 5200;

/** A soft two-note bell, synthesized so it needs no audio file. */
function chime(second: boolean) {
  const volume = readSettings().volume;
  if (!volume || typeof AudioContext === 'undefined') return;
  const context = new AudioContext();
  const notes = second ? [659.25, 987.77, 1318.5] : [587.33, 880];
  notes.forEach((frequency, i) => {
    const start = context.currentTime + i * 0.13;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22 * volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
    tone.connect(gain).connect(context.destination);
    tone.start(start);
    tone.stop(start + 1.7);
  });
  window.setTimeout(() => void context.close(), 2400);
}

/** The card that opens in the middle of the world when a discovery is found. */
export function RevealMoment({ moment, total = 2 }: { moment: Moment | null; total?: number }) {
  const t = useT();
  const [shown, setShown] = useState<Moment | null>(null);

  useEffect(() => {
    if (!moment) return;
    setShown(moment);
    try { chime(moment.count >= total); } catch { /* audio is optional */ }
    const timer = window.setTimeout(() => setShown(null), SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [moment, total]);

  if (!shown) return null;
  return (
    <button type="button" key={shown.id} className="reveal-moment" onClick={() => setShown(null)} aria-live="polite">
      <span className="reveal-moment-kicker">{t('Memory found · {count} of {total}', { count: shown.count, total })}</span>
      <strong className="reveal-moment-title">{shown.title}</strong>
      {shown.photoUrl && <img className="reveal-moment-photo" src={shown.photoUrl} alt="" />}
      {shown.quote && <q className="reveal-moment-quote">{shown.quote}</q>}
      {shown.note && <span className="reveal-moment-note">{shown.note}</span>}
      <span className="reveal-moment-next">{shown.count >= total ? t('Both found. The way out is open.') : t('One more is waiting.')}</span>
    </button>
  );
}
