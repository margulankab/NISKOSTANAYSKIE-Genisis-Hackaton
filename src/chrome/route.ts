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

/**
 * In the web build the route lives in memory and is mirrored to the address when the viewer allows it.
 * Some viewers (file previews, in-app browsers, sandboxed frames) refuse or ignore address changes;
 * the game must still move between screens there.
 */
let memoryRoute: string | null = null;
const routeListeners = new Set<() => void>();
function setRoute(path: string) {
  memoryRoute = path;
  for (const listener of routeListeners) listener();
}
function safeHash() {
  try { return window.location.hash; } catch { return ''; }
}

/** The app route, such as "/" or "/examples/park". */
export function currentPath() {
  const raw = hashRouting ? memoryRoute ?? pathFor(safeHash()) : window.location.pathname;
  return raw.replace(/\/$/, '') || '/';
}

/** Go to an app route or same-origin URL. */
export function navigate(to: string) {
  if (!hashRouting) { window.location.assign(to); return; }
  const url = new URL(to, window.location.href);
  const path = url.hash && url.pathname === window.location.pathname ? pathFor(url.hash) : url.pathname;
  const hash = hashFor(path);
  const go = () => {
    setRoute(path);
    try { if (safeHash().replace(/^#/, '') !== hash) history.replaceState(null, '', '#' + hash); } catch { /* the viewer keeps its own address */ }
    window.scrollTo({ top: 0 });
  };
  // Same page-turn as the path build's cross-document transition, where the browser supports it.
  const motion = document.documentElement.dataset.motion;
  const reduced = motion === 'off' || (motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!document.startViewTransition || reduced) { go(); return; }
  // Animation frames pause during a transition, so wait for React's commit with a short task instead.
  try {
    document.startViewTransition(() => new Promise<void>((resolve) => { go(); setTimeout(resolve, 30); }));
  } catch { go(); }
}

/**
 * In the web build, give in-app links ("/examples") real hash addresses ("#examples"), so opening one
 * in a new tab or copying it works from a file or a static host; the route stays in data-route.
 */
function rewriteLinks(root: ParentNode) {
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) {
    const route = link.getAttribute('href')!;
    link.dataset.route = route;
    link.setAttribute('href', '#' + hashFor(route));
  }
}

/** In the web build, turn clicks on in-app links into hash navigation (with the page-turn animation). */
export function installHashLinks() {
  if (!hashRouting) return;
  const start = () => {
    rewriteLinks(document);
    new MutationObserver(() => rewriteLinks(document)).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
  // Bubble phase on window: runs after the game's own "leave without saving?" check, which cancels the click.
  window.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-route], a[href^="/"]') : null;
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    event.preventDefault();
    navigate(link.dataset.route ?? link.getAttribute('href')!);
  });
}

export function subscribeToRoute(listener: () => void) {
  if (!hashRouting) return () => {};
  // Typing a new #address still works where the viewer allows it.
  const fromAddress = () => setRoute(pathFor(safeHash()));
  routeListeners.add(listener);
  window.addEventListener('hashchange', fromAddress);
  return () => { routeListeners.delete(listener); window.removeEventListener('hashchange', fromAddress); };
}
