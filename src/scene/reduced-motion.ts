import { readSettings, subscribeToSettings } from '../menus/settings';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function subscribeToReducedMotion(update: () => void) {
  const preference = window.matchMedia(reducedMotionQuery);
  preference.addEventListener('change', update);
  const unsubscribe = subscribeToSettings(update);
  return () => {
    preference.removeEventListener('change', update);
    unsubscribe();
  };
}

/** The Settings menu can override the device preference. */
export function prefersReducedMotion() {
  const { reducedMotion } = readSettings();
  return reducedMotion === 'system' ? window.matchMedia(reducedMotionQuery).matches : reducedMotion === 'on';
}
