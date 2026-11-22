import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { prefersReducedMotion, subscribeToReducedMotion } from '../scene/reduced-motion';
import type { DialogLine, Lore } from './lore';

/** Quest tracker in the corner of the world; finished quests tick off with a short stamp. */
export function QuestLog({ lore, done, title }: { lore: Pick<Lore, 'quests'>; done: Record<'first' | 'second' | 'end', boolean>; title: string }) {
  const active = lore.quests.find((quest) => !done[quest.id])?.id;
  return (
    <section className="quest-log" aria-label={title}>
      <h3>{title}</h3>
      <ol>
        {lore.quests.map((quest) => (
          <li key={quest.id} className={done[quest.id] ? 'is-done' : quest.id === active ? 'is-active' : undefined}>
            <span className="quest-box" aria-hidden="true" />
            <span className="quest-text">{quest.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Plays dialog lines when the walk reaches a new beat (arrival, each discovery, both found, the end).
 * Lines type out, advance on click (or after a pause long enough to read them) and never block walking.
 */
export function useLoreFeed(lore: Lore, beats: { started: boolean; found: [boolean, boolean]; ready: boolean; ended: boolean }) {
  const [queue, setQueue] = useState<DialogLine[]>([]);
  const played = useRef(new Set<string>());
  useEffect(() => {
    const add = (key: string, lines: DialogLine[]) => {
      if (played.current.has(key)) return;
      played.current.add(key);
      setQueue((current) => [...current, ...lines]);
    };
    // Restored saves skip beats that already happened, so a resumed walk does not retell them.
    if (beats.started) add('intro', beats.found[0] || beats.found[1] || beats.ended ? [] : lore.intro);
    if (beats.found[0]) add('first', lore.found[0]);
    if (beats.found[1]) add('second', lore.found[1]);
    if (beats.ready) add('ready', beats.ended ? [] : lore.ready);
    if (beats.ended) add('end', lore.ending);
  }, [lore, beats.started, beats.found[0], beats.found[1], beats.ready, beats.ended]); // eslint-disable-line react-hooks/exhaustive-deps
  return { line: queue[0] ?? null, next: () => setQueue((current) => current.slice(1)), left: Math.max(0, queue.length - 1) };
}

export function DialogBox({ line, left, onNext, hint }: { line: DialogLine | null; left: number; onNext: () => void; hint: string }) {
  const reduced = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const full = line ? line.text + (line.quote ? ` “${line.quote}”` : '') : '';
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(reduced ? full.length : 0);
    if (!line || reduced) return;
    const timer = window.setInterval(() => setShown((count) => {
      if (count >= full.length) { window.clearInterval(timer); return count; }
      return count + 2;
    }), 24);
    return () => window.clearInterval(timer);
  }, [line, full, reduced]);
  // Long enough to read: about 4 words a second, at least 3.2 s.
  useEffect(() => {
    if (!line) return;
    const timer = window.setTimeout(onNext, Math.max(3200, full.split(/\s+/).length * 260 + 1400));
    return () => window.clearTimeout(timer);
  }, [line, full, onNext]);
  if (!line) return null;
  const typed = full.slice(0, shown);
  const textPart = typed.slice(0, line.text.length);
  const quotePart = typed.slice(line.text.length);
  return (
    <div className="dialog-box" aria-live="polite" onClick={onNext} key={full}>
      <p className="dialog-speaker">{line.speaker}</p>
      <p className="dialog-text">
        <span className="visually-hidden">{full}</span>
        <span aria-hidden="true">{textPart}{quotePart && <q className="dialog-quote">{quotePart.replace(/^ “|”$/g, '')}</q>}</span>
      </p>
      <p className="dialog-next" aria-hidden="true">{left > 0 ? `▸ ${left}` : '▸'} {hint}</p>
    </div>
  );
}
