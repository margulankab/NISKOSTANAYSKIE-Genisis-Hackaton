/**
 * Routing for two kinds of hosting:
 * - normal builds use the URL path (/examples, /play/…), served by Vite or a host with an SPA fallback;
 * - the web build (`npm run build:web`, VITE_ROUTER=hash) keeps the route after `#`, so the game works
 *   from any static host or sub-folder (GitHub Pages, an artifact page) with no server rules.
 */
export const hashRouting = import.meta.env.VITE_ROUTER === 'hash';

/** The app route, such as "/" or "/examples/park". */
export function currentPath() {
  const raw = hashRouting ? decodeURI(window.location.hash.replace(/^#/, '')) || '/' : window.location.pathname;
  return raw.replace(/\/$/, '') || '/';
}

/** Go to an app route or same-origin URL. */
export function navigate(to: string) {
  if (!hashRouting) { window.location.assign(to); return; }
  const url = new URL(to, window.location.href);
  const path = url.origin === window.location.origin && !url.hash.startsWith('#/') ? url.pathname : url.hash.slice(1) || '/';
  if (window.location.hash === '#' + path) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = path;
  window.scrollTo({ top: 0 });
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
