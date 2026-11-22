import { useCallback, useRef, useState } from 'react';
import type { Plot } from './plot-schema';

export function usePlotVisit(plot: Plot | undefined, restored: number | undefined, onEnding?: () => void) {
  const [completed, setCompleted] = useState(restored ?? 0);
  const count = useRef(completed);
  const [playing, setPlaying] = useState(false);
  const finish = useCallback((index: number) => {
    if (!plot || index !== count.current || index >= plot.moments.length) return;
    count.current += 1;
    setCompleted(count.current);
    setPlaying(false);
    if (count.current === plot.moments.length) onEnding?.();
  }, [onEnding, plot]);
  if (!plot) return undefined;
  return {
    plot, completed, playing, finish,
    current: plot.moments[completed], ended: completed === plot.moments.length,
    start: () => setPlaying(true),
    reset: () => { count.current = 0; setCompleted(0); setPlaying(false); },
  };
}

export type PlotVisit = NonNullable<ReturnType<typeof usePlotVisit>>;

/** The plot's moments below the world. The ending card shows here only when the 3D world (and its own card) is unavailable. */
export function PlotProgress({ visit, staticMode, onReplay }: { visit: PlotVisit; staticMode: boolean; onReplay(): void }) {
  const recent = visit.plot.moments[visit.completed - 1];
  return <section className="plot-progress" aria-label="Memory moments">
    <p role="status">{visit.completed} of {visit.plot.moments.length} moments complete</p>
    {recent && <div className="plot-recollection">
      <h3>{recent.title}</h3>
      <p>{recent.description}</p>
      {recent.evidence && <blockquote>{recent.evidence}</blockquote>}
    </div>}
    {staticMode && visit.current && <div className="plot-recollection">
      <h3>{visit.current.title}</h3>
      {visit.playing && <p>{visit.current.description}</p>}
      <button type="button" onClick={() => visit.playing ? visit.finish(visit.completed) : visit.start()}>
        {visit.playing ? 'Continue' : visit.current.actionLabel}
      </button>
    </div>}
    {visit.ended && staticMode && <div className="closing-card" role="status">
      <h3>Memory complete</h3>
      <p>{visit.plot.closing}</p>
      <button type="button" onClick={onReplay}>Replay visit</button>
    </div>}
  </section>;
}
