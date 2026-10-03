const CACHE = 'repertorio-offline-v1';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const home = await fetch('/');
    if (!home.ok) throw new Error('Não foi possível preparar o modo offline.');
    await cache.put('/', home.clone());
    await Promise.allSettled(['/manifest.webmanifest', '/app-icon.png', '/icon-192.svg', '/icon-512.svg'].map((url) => cache.add(url)));
    const html = await home.text();
    const assets = [...html.matchAll(/(?:src|href)=["'](\/[^"']+\.(?:js|css|png|jpg|svg|ico|woff2?)(?:\?[^"']*)?)["']/g)].map((m) => m[1]);
    await Promise.allSettled([...new Set(assets)].map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('repertorio-offline-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/_server') || url.pathname.startsWith('/api/')) return;
  if (request.mode !== 'navigate' && request.destination !== 'script' && request.destination !== 'style' && request.destination !== 'image' && request.destination !== 'font') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    } catch (error) {
      return await cache.match(request) || (request.mode === 'navigate' ? await cache.match('/') : undefined) || Promise.reject(error);
    }
  })());
});
