/**
 * Routing for two kinds of hosting:
 * - normal builds use the URL path (/examples, /play/…), served by Vite or a host with an SPA fallback;
 * - the web build (`npm run build:web`, VITE_ROUTER=hash) keeps the route in a plain hash name, so the game
 *   works from any static host or sub-folder (GitHub Pages, an artifact page) with no server rules.
 *   Hash names use letters, digits and hyphens only ("#examples", "#new--prompt", "#play--<id>"), because
 *   some hosts pass only plain names; Settings is "#options" since some hosts reserve "#settings".
 */
export const hashRouting = import.meta.env.VITE_ROUTER === 'hash';

const renamed: Record<string, string> = { settings: 'options' };
const restored: Record<string, string> = { options: 'settings' };

/** "/new/prompt" → "new--prompt"; "/" → "". */
export function hashFor(path: string) {
  const [first = '', ...rest] = path.replace(/^\/+|\/+$/g, '').split('/');
  return [renamed[first] ?? first, ...rest].filter(Boolean).join('--');
}
/** "new--prompt" → "/new/prompt"; "" → "/". */
export function pathFor(hash: string) {
  const [first = '', ...rest] = decodeURIComponent(hash.replace(/^#\/?/, '')).split('--');
  const parts = [restored[first] ?? first, ...rest].filter(Boolean);
  return '/' + parts.join('/');
}

/** The app route, such as "/" or "/examples/park". */
export function currentPath() {
  const raw = hashRouting ? pathFor(window.location.hash) : window.location.pathname;
  return raw.replace(/\/$/, '') || '/';
}

/** Go to an app route or same-origin URL. */
export function navigate(to: string) {
  if (!hashRouting) { window.location.assign(to); return; }
  const url = new URL(to, window.location.href);
  const path = url.hash && url.pathname === window.location.pathname ? pathFor(url.hash) : url.pathname;
  const hash = hashFor(path);
  const go = () => {
    if (window.location.hash.replace(/^#/, '') === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
    else window.location.hash = hash;
    window.scrollTo({ top: 0 });
  };
  // Same page-turn as the path build's cross-document transition, where the browser supports it.
  const motion = document.documentElement.dataset.motion;
  const reduced = motion === 'off' || (motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!document.startViewTransition || reduced) { go(); return; }
  document.startViewTransition(() => new Promise<void>((resolve) => {
    // Animation frames pause during a transition, so wait for React's commit with a task instead.
    window.addEventListener('hashchange', () => setTimeout(resolve, 30), { once: true });
    go();
  }));
}

/** In the web build, turn clicks on in-app links ("/examples") into hash navigation. */
export function installHashLinks() {
  if (!hashRouting) return;
  // Bubble phase on window: runs after the game's own "leave without saving?" check, which cancels the click.
  window.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="/"]') : null;
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    event.preventDefault();
    navigate(link.getAttribute('href')!);
  });
}

export function subscribeToRoute(listener: () => void) {
  if (!hashRouting) return () => {};
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
