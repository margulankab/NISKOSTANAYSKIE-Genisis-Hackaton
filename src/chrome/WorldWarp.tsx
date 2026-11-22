import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { currentWarp, endWarp, subscribeToWarp } from './immersive';
import type { Warp } from './immersive';
import { prefersReducedMotion, subscribeToReducedMotion } from '../scene/reduced-motion';

/** Timeline in ms. The world mounts underneath at once; this layer only covers the swap. */
const FLY = 520, LINE = 190, HOLD = 260, IRIS = 620;

/**
 * Entry transition: the words the player typed lift out of the text box, the build log types
 * underneath them, then the screen opens like an iris onto the world. Decorative only.
 */
export function WorldWarp() {
  const warp = useSyncExternalStore(subscribeToWarp, currentWarp, () => null);
  return warp ? <WarpLayer key={warp.id} warp={warp} /> : null;
}

function WarpLayer({ warp }: { warp: Warp }) {
  const reduced = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const words = useRef<HTMLParagraphElement>(null);
  const [stage, setStage] = useState<'fly' | 'log' | 'open'>('fly');
  const [shown, setShown] = useState(reduced ? warp.lines.length : 0);
  const logEnd = FLY + LINE * warp.lines.length + HOLD;

  // FLIP: start the words where the text box was, then let them settle in the middle.
  useLayoutEffect(() => {
    const element = words.current;
    if (!element || reduced || !warp.from) return;
    const end = element.getBoundingClientRect();
    const scale = Math.min(1.4, Math.max(0.5, warp.from.width / Math.max(1, end.width)));
    element.style.transition = 'none';
    element.style.transformOrigin = 'top left';
    element.style.transform = `translate(${warp.from.left - end.left}px, ${warp.from.top - end.top}px) scale(${scale})`;
    element.getBoundingClientRect();
    element.style.transition = `transform ${FLY}ms cubic-bezier(.2,.8,.2,1)`;
    element.style.transform = '';
  }, [reduced, warp.from]);

  useEffect(() => {
    if (reduced) {
      const open = window.setTimeout(() => setStage('open'), 700);
      const done = window.setTimeout(() => endWarp(warp.id), 950);
      return () => { window.clearTimeout(open); window.clearTimeout(done); };
    }
    const timers = [window.setTimeout(() => setStage('log'), FLY)];
    warp.lines.forEach((_, index) => timers.push(window.setTimeout(() => setShown(index + 1), FLY + LINE * (index + 1))));
    timers.push(window.setTimeout(() => setStage('open'), logEnd));
    timers.push(window.setTimeout(() => endWarp(warp.id), logEnd + IRIS + 40));
    return () => timers.forEach(window.clearTimeout);
  }, [reduced, warp, logEnd]);

  return (
    <div className={`warp is-${stage}${reduced ? ' warp-reduced' : ''}`} aria-hidden="true"
      style={{ '--iris': `${IRIS}ms` } as React.CSSProperties}>
      <div className="warp-inner">
        {warp.words && <p className="warp-words" ref={words}>“{warp.words}”</p>}
        <p className="warp-title">{warp.title}</p>
        <ol className="warp-log">
          {warp.lines.slice(0, shown).map((line, index) => (
            <li key={index}><span>&gt;</span> {line}{index === shown - 1 && stage !== 'open' && <i className="warp-cur" />}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
