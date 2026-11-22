const cacheName = 'genesis-visit-shell-v1';
const shellUrl = new URL('/index.html', self.location.origin).href;

async function keepShell(response) {
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return;
  const html = await response.clone().text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(match => match[1]))];
  if (!assets.length) return;
  const cache = await caches.open(cacheName);
  await Promise.all(assets.map(async path => {
    if (!await cache.match(path)) await cache.add(path);
  }));
  await cache.put(shellUrl, response);
}

self.addEventListener('install', event => {
  event.waitUntil(fetch(shellUrl).then(keepShell).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    const network = fetch(request);
    event.waitUntil(network.then(response => keepShell(response.clone())).catch(() => {}));
    event.respondWith(network.catch(async () => {
      const cached = await caches.match(shellUrl);
      return cached ?? Response.error();
    }));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone()).catch(() => {});
      return response;
    })());
  }
});
