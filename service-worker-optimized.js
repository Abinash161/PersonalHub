// ULTRA-EFFICIENT SERVICE WORKER
// Optimized for instant offline access and cache-first strategy

const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `PersonalHub-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  './',
  './index.html',
  './music.html',
  './notes.html',
  './gallery.html',
  './letters.html',
  './manifest.json',
  './performance-core.js',
  './music-player-optimized.js'
];

// Skip waiting on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache static assets
      return Promise.all(
        STATIC_ASSETS.map(url => 
          cache.add(url).catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy: Cache first, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external resources (Firebase, Cloudinary, etc.)
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Rewrite URLs without .html extension
  const pathname = url.pathname;
  const pages = ['notes', 'music', 'gallery', 'letters'];
  for (const page of pages) {
    if (pathname.endsWith(`/${page}`) || pathname === `/${page}`) {
      url.pathname = `/${page}.html`;
      break;
    }
  }

  // Create a new request with the rewritten URL if it changed
  const modifiedRequest = new Request(url.toString(), request);

  // Cache-first for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(modifiedRequest).then((response) => {
        if (response) return response;
        
        return fetch(modifiedRequest)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(modifiedRequest, response.clone());
              });
            }
            return response;
          })
          .catch(() => {
            // Return fallback page
            return caches.match('./index.html');
          });
      })
    );
    return;
  }

  // Network-first for dynamic content with fallback
  event.respondWith(
    fetch(modifiedRequest)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(modifiedRequest, response.clone());
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(modifiedRequest).then((response) => {
          return response || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Helper to identify static assets
function isStaticAsset(pathname) {
  return pathname.endsWith('.html') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.json') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.svg') ||
         pathname === '/' ||
         pathname === '';
}

// Background sync for offline uploads
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-music') {
    event.waitUntil(syncMusic());
  }
});

async function syncMusic() {
  try {
    const db = await getIndexedDB();
    const pending = await getPendingUploads(db);
    
    for (const item of pending) {
      try {
        await uploadTrack(item);
        await markAsSynced(db, item.id);
      } catch (e) {
        console.error('Sync error:', e);
      }
    }
  } catch (e) {
    console.error('Background sync failed:', e);
  }
}

// Periodic sync for cache updates (batched every 3 hours)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-music-cache') {
    event.waitUntil(refreshMusicCache());
  }
});

async function refreshMusicCache() {
  try {
    const response = await fetch('/api/music');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/music', response);
    }
  } catch (e) {
    console.error('Cache refresh failed:', e);
  }
}

async function getIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('PersonalHub', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingUploads(db) {
  return new Promise((resolve) => {
    const tx = db.transaction('music', 'readonly');
    const store = tx.objectStore('music');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.filter(item => !item.synced));
  });
}

async function markAsSynced(db, id) {
  return new Promise((resolve) => {
    const tx = db.transaction('music', 'readwrite');
    const store = tx.objectStore('music');
    const item = store.get(id);
    item.onsuccess = () => {
      const data = item.result;
      data.synced = true;
      store.put(data);
      tx.oncomplete = () => resolve();
    };
  });
}
