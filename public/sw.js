// Cópias completas são publicadas somente depois de todos os downloads.
const PREFIX = 'repertorio-offline-v2-';
const RUNTIME = 'repertorio-runtime-v2';
const MARKER = '/__repertorio_offline_pronto__';
let preparing;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function snapshots() {
  const names = (await caches.keys()).filter((name) => name.startsWith(PREFIX)).sort().reverse();
  const complete = [];
  for (const name of names) {
    const cache = await caches.open(name);
    if (await cache.match(MARKER)) complete.push(name);
  }
  return complete;
}

async function cached(request) {
  for (const name of [...await snapshots(), RUNTIME, 'repertorio-offline-v1']) {
    if (!(await caches.has(name))) continue;
    const found = await (await caches.open(name)).match(request);
    if (found) return found;
  }
}

async function download(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, { cache: 'no-cache', signal: controller.signal, credentials: 'same-origin' });
    if (!response.ok || response.redirected) throw new Error('Download incompleto. Tente novamente com uma conexão estável.');
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function references(text, base, html) {
  const pattern = html
    ? /(?:src|href)=["']([^"']+)["']/g
    : /["'`]((?:\.?\.?\/|\/)?[a-zA-Z0-9_$%@+./-]+\.(?:m?js|css|woff2?)(?:\?[^"'`\s]*)?)["'`]/g;
  const urls = [];
  for (const match of text.matchAll(pattern)) {
    const value = match[1];
    if (/^(?:data:|blob:)/.test(value)) continue;
    const url = new URL(!html && value.startsWith('assets/') ? '/' + value : value, base);
    const compiledAsset = /\/[\w.$%+-]+-[\w-]{8,}\.(?:m?js|css|woff2?)$/.test(url.pathname);
    if (url.origin === self.location.origin && (html || compiledAsset) && /\.(?:m?js|css|woff2?|png|jpg|svg|ico)$/.test(url.pathname)) urls.push(url.href);
  }
  if (!html) {
    for (const match of text.matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
      const url = new URL(match[1], base);
      if (url.origin === self.location.origin && /\.(?:woff2?|png|jpg|svg)$/.test(url.pathname)) urls.push(url.href);
    }
  }
  return urls;
}

async function prepare(paths, assets) {
  const name = PREFIX + Date.now();
  const cache = await caches.open(name);
  const seen = new Set();
  const queue = [...paths, ...assets, '/manifest.webmanifest', '/app-icon.png', '/multivibe-logo.jpg'];
  try {
    while (queue.length) {
      const batch = [];
      while (queue.length && batch.length < 4) {
        const url = new URL(queue.shift(), self.location.origin);
        if (url.origin !== self.location.origin || seen.has(url.href)) continue;
        if (url.pathname.startsWith('/_server') || url.pathname.startsWith('/api/')) continue;
        seen.add(url.href);
        batch.push(url);
      }
      await Promise.all(batch.map(async (url) => {
        const response = await download(url.href);
        const type = response.headers.get('content-type') || '';
        const html = type.includes('text/html');
        if (/\.(?:m?js|css)$/.test(url.pathname) && html) throw new Error('A atualização ainda não está disponível por completo. Tente novamente.');
        await cache.put(url.href, response.clone());
        if (html || /\.(?:m?js|css)$/.test(url.pathname)) {
          const text = await response.text();
          queue.push(...references(text, url.href, html));
          // TanStack também pode iniciar o app com import() em um script inline.
          if (html) queue.push(...references(text, url.href, false));
        }
      }));
    }
    const ready = { preparedAt: Date.now(), pages: paths.length };
    await cache.put(MARKER, new Response(JSON.stringify(ready), { headers: { 'Content-Type': 'application/json' } }));
    // Mantém também a versão anterior; nunca apaga a última cópia durante um download.
    const complete = await snapshots();
    for (const old of complete.slice(2)) await caches.delete(old);
    return ready;
  } catch (error) {
    await caches.delete(name);
    throw error;
  }
}

self.addEventListener('message', (event) => {
  const port = event.ports[0];
  if (!port) return;
  event.waitUntil((async () => {
    try {
      if (event.data?.type === 'OFFLINE_STATUS') {
        const names = await snapshots();
        const marker = names.length ? await (await caches.open(names[0])).match(MARKER) : null;
        port.postMessage({ ok: true, result: marker ? await marker.json() : null });
      } else if (event.data?.type === 'PREPARE_OFFLINE') {
        if (!preparing) preparing = prepare(event.data.paths || ['/'], event.data.assets || []).finally(() => { preparing = null; });
        port.postMessage({ ok: true, result: await preparing });
      }
    } catch (error) {
      port.postMessage({ ok: false, error: error.message || 'Não foi possível preparar as telas offline.' });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_server') || url.pathname.startsWith('/api/') || url.pathname === '/sw.js' || url.pathname === '/offline-worker') return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(request, { signal: controller.signal });
        if (response.ok) return response;
        const saved = await cached(url.origin + url.pathname);
        return saved || response;
      } catch {
        const saved = await cached(url.origin + url.pathname);
        if (saved) return saved;
        return new Response('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title><body style="font:18px system-ui;padding:32px;max-width:560px;margin:auto"><h1>Esta tela ainda não foi salva</h1><p>Conecte-se à internet e prepare o acesso offline na tela inicial. Músicas e repertórios já baixados continuam guardados neste aparelho.</p><a href="/">Voltar ao início</a></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      } finally {
        clearTimeout(timeout);
      }
    })());
    return;
  }
  if (!['script', 'style', 'worker', 'image', 'font'].includes(request.destination) && !/\.(?:m?js|css|woff2?)$/.test(url.pathname)) return;
  event.respondWith((async () => {
    const saved = await cached(request);
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque' && !response.headers.get('content-type')?.includes('text/html')) {
      const copy = response.clone();
      event.waitUntil(caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {}));
    }
    return response;
  })());
});
