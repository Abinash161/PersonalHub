const VERSION = 'v16'; // bump to force update
const STATIC_CACHE = `static-${VERSION}`;
const MEDIA_CACHE = `media-${VERSION}`;
const HTML_CACHE  = `html-${VERSION}`;
const MAX_MEDIA_ITEMS = 60;

const STATIC_ASSETS = [
  '/', '/index.html', '/home.html', '/notes.html', '/gallery.html', '/letters.html', '/music.html',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'
];

// Normalize a request key (ignore Range when caching media)
const normalize = (req) => new Request(new URL(req.url), { method: 'GET', mode: 'cors', credentials: 'same-origin' });

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC_CACHE, MEDIA_CACHE, HTML_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Trim cache
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

// Navigation handler
// Replace handleNavigation with network-first + cache fallback
async function handleNavigation(event) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const preload = await event.preloadResponse;
    if (preload) {
      cache.put(event.request, preload.clone());
      return preload;
    }
  } catch {}

  try {
    const res = await fetch(event.request, { cache: 'no-store' });
    if (res && res.ok) cache.put(event.request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    return new Response(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:20px">You are offline.</body>',
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }
}

// Range support for cached media
async function handleRangeRequest(request) {
  const rangeHeader = request.headers.get('Range');
  if (!rangeHeader) return null;

  const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
  if (!match) return null;

  const start = Number(match[1]);
  const endFromHeader = match[2] ? Number(match[2]) : undefined;

  const cache = await caches.open(MEDIA_CACHE);
  const key = normalize(request);
  const cached = await cache.match(key);
  if (!cached || !cached.ok) return null;

  const buf = await cached.arrayBuffer();
  const total = buf.byteLength;
  const end = endFromHeader !== undefined ? Math.min(endFromHeader, total - 1) : total - 1;
  const chunk = buf.slice(start, end + 1);

  const headers = new Headers(cached.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
  headers.set('Content-Length', String(chunk.byteLength));
  headers.set('Accept-Ranges', 'bytes');

  return new Response(chunk, { status: 206, statusText: 'Partial Content', headers });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const dest = req.destination;

  if (req.mode === 'navigate' || (dest === '' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(handleNavigation(event));
    return;
  }

  const isMedia = dest === 'image' || dest === 'audio' || dest === 'video' ||
                  url.pathname.match(/\.(png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a|mp4)$/i);

  if (isMedia) {
    event.respondWith((async () => {
      const rangeResponse = await handleRangeRequest(req);
      if (rangeResponse) return rangeResponse;

      const cache = await caches.open(MEDIA_CACHE);
      const key = normalize(req);
      const cached = await cache.match(key);
      if (cached) {
        fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            cache.put(key, res.clone());
            trimCache(MEDIA_CACHE, MAX_MEDIA_ITEMS);
          }
        }).catch(() => {});
        return cached;
      }

      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) {
          if (res.status === 200) {
            await cache.put(key, res.clone());
            trimCache(MEDIA_CACHE, MAX_MEDIA_ITEMS);
          }
        }
        return res;
      } catch {
        return new Response('', { status: 504, statusText: 'Gateway Timeout' });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    const networkPromise = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || networkPromise || new Response('', { status: 504 });
  })());
});

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'GET_VERSION') event.source?.postMessage({ type: 'VERSION', version: VERSION });

  if (data.type === 'CACHE_NEW_FILE' && data.url) {
    try {
      const res = await fetch(data.url, { mode: 'cors' });
      if (res && (res.ok || res.type === 'opaque')) {
        const cache = await caches.open(MEDIA_CACHE);
        await cache.put(normalize(new Request(data.url)), res.clone());
        await trimCache(MEDIA_CACHE, MAX_MEDIA_ITEMS);
      }
    } catch {}
  }

  if (data.type === 'CACHE_DELETE_URL' && data.url) {
    const cache = await caches.open(MEDIA_CACHE);
    await cache.delete(normalize(new Request(data.url)));
  }
});
