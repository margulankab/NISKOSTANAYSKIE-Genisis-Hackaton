const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function subscribeToReducedMotion(update: () => void) {
  const preference = window.matchMedia(reducedMotionQuery);
  preference.addEventListener('change', update);
  return () => preference.removeEventListener('change', update);
}

export function prefersReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}
