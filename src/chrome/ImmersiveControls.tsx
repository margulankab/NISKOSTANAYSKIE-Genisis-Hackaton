import { useEffect, useRef } from 'react';
import { canFullscreen, exitFullscreen, setImmersive, takeChosenExit, toggleFullscreen, useFullscreen } from './immersive';
import { useT } from '../i18n/i18n';

/**
 * While a world is open: use the immersive layout, pause when the player leaves full screen
 * (Esc in full screen is taken by the browser), and leave full screen with the world.
 */
export function useImmersiveSession(pause: () => void) {
  const fullscreen = useFullscreen();
  const was = useRef(fullscreen);
  const onPause = useRef(pause);
  onPause.current = pause;
  useEffect(() => {
    setImmersive(true);
    return () => { setImmersive(false); exitFullscreen(); };
  }, []);
  useEffect(() => {
    if (was.current && !fullscreen && !takeChosenExit()) onPause.current();
    was.current = fullscreen;
  }, [fullscreen]);
}

export function FullscreenButton() {
  const fullscreen = useFullscreen();
  const t = useT();
  if (!canFullscreen()) return null;
  return (
    <button type="button" className="fullscreen-button" aria-pressed={fullscreen} onClick={toggleFullscreen}>
      <span aria-hidden="true">{fullscreen ? '⇲' : '⛶'}</span> {t(fullscreen ? 'Exit full screen' : 'Full screen')}
    </button>
  );
}

/** Component form of useImmersiveSession, for views that are immersive only after Enter world. */
export function ImmersiveSession({ pause }: { pause: () => void }) {
  useImmersiveSession(pause);
  return null;
}
