// HIGH-PERFORMANCE STATE MANAGEMENT & CACHING LAYER
// Optimized for real-time results with minimal overhead

class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(listener);
    return () => this.events.get(event).delete(listener);
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(listener => listener(data));
    }
  }

  off(event, listener) {
    if (this.events.has(event)) {
      this.events.get(event).delete(listener);
    }
  }
}

// FAST STATE MANAGER
class StateManager extends EventEmitter {
  constructor() {
    super();
    this.state = {
      playlist: [],
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentIndex: -1,
    };
    this.listeners = new Map();
    this.batchUpdates = [];
    this.isUpdating = false;
  }

  setState(updates) {
    const changed = {};
    let hasChanges = false;

    for (const [key, value] of Object.entries(updates)) {
      if (JSON.stringify(this.state[key]) !== JSON.stringify(value)) {
        changed[key] = value;
        this.state[key] = value;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.emit('state-change', { changed, state: this.state });
    }
    return hasChanges;
  }

  getState() {
    return { ...this.state };
  }

  subscribe(callback) {
    const id = Math.random();
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }
}

// EFFICIENT DATABASE CACHE
class CacheLayer {
  constructor(dbName = 'PersonalHub', storeName = 'music') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.memCache = new Map();
    this.lastSync = 0;
    this.syncInterval = 30000; // 30 seconds
  }

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('url', 'url', { unique: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async setMany(items) {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      
      // Clear and add new items
      store.clear();
      items.forEach(item => {
        store.add(item);
        this.memCache.set(item.id, item);
      });

      tx.oncomplete = () => resolve();
    });
  }

  async getAll() {
    // Return from memory cache if fresh
    if (this.memCache.size > 0 && Date.now() - this.lastSync < 5000) {
      return Array.from(this.memCache.values());
    }

    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        this.memCache.clear();
        req.result.forEach(item => this.memCache.set(item.id, item));
        this.lastSync = Date.now();
        resolve(req.result);
      };
    });
  }

  async delete(id) {
    if (!this.db) await this.init();

    this.memCache.delete(id);
    return new Promise((resolve) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(id);
      tx.oncomplete = () => resolve();
    });
  }

  clearMemCache() {
    this.memCache.clear();
  }
}

// EFFICIENT DOM BATCH RENDERER
class DOMRenderer {
  constructor() {
    this.pendingUpdates = [];
    this.isScheduled = false;
    this.updateFn = null;
  }

  schedule(updateFn) {
    this.updateFn = updateFn;
    if (!this.isScheduled) {
      this.isScheduled = true;
      requestAnimationFrame(() => {
        updateFn();
        this.isScheduled = false;
      });
    }
  }

  // Efficient list render with key-based reconciliation
  reconcileList(container, items, renderItem, getKey) {
    const current = new Map();
    const existing = new Map();

    // Store existing elements by key
    Array.from(container.children).forEach(el => {
      const key = el.dataset.key;
      if (key) existing.set(key, el);
    });

    // Create map of new items
    items.forEach(item => {
      current.set(getKey(item), item);
    });

    // Remove items no longer in list
    existing.forEach((el, key) => {
      if (!current.has(key)) {
        el.remove();
      }
    });

    // Add or update items
    items.forEach((item, index) => {
      const key = getKey(item);
      const el = existing.get(key);

      if (el) {
        // Update existing element
        renderItem(el, item);
        container.appendChild(el); // Maintain order
      } else {
        // Create new element
        const newEl = renderItem(document.createElement('div'), item);
        newEl.dataset.key = key;
        container.appendChild(newEl);
      }
    });
  }
}

// SMART REQUEST DEBOUNCER
class Debouncer {
  constructor(fn, delay = 300) {
    this.fn = fn;
    this.delay = delay;
    this.timeout = null;
    this.lastArgs = null;
  }

  call(...args) {
    this.lastArgs = args;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.fn(...this.lastArgs);
    }, this.delay);
  }

  cancel() {
    clearTimeout(this.timeout);
  }
}

// EFFICIENT AUDIO POOL MANAGER
class AudioPool {
  constructor(size = 3) {
    this.pool = [];
    this.active = new Map();
    
    for (let i = 0; i < size; i++) {
      const audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      this.pool.push(audio);
    }
  }

  acquire(src) {
    // Return active if already loaded
    if (this.active.has(src)) {
      return this.active.get(src);
    }

    // Get from pool
    const audio = this.pool.pop() || document.createElement('audio');
    audio.src = src;
    audio.preload = 'auto';
    this.active.set(src, audio);
    document.body.appendChild(audio);

    return audio;
  }

  release(src) {
    const audio = this.active.get(src);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      this.active.delete(src);
      if (this.pool.length < 3) {
        this.pool.push(audio);
      } else {
        audio.remove();
      }
    }
  }

  cleanup() {
    this.pool.forEach(a => a.remove());
    this.active.forEach(a => a.remove());
    this.pool = [];
    this.active.clear();
  }
}

// BROADCAST OPTIMIZATIONS
class BroadcastSync {
  constructor(channelName = 'app-sync') {
    this.channel = null;
    this.listeners = new Map();
    this.lastMessage = {};
    this.dedupeTime = 100; // Ignore duplicate messages within 100ms
    this.init(channelName);
  }

  init(channelName) {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(channelName);
      this.channel.addEventListener('message', (e) => {
        const key = `${e.data.type}`;
        const now = Date.now();

        // Skip duplicates within dedupeTime
        if (this.lastMessage[key] && now - this.lastMessage[key].time < this.dedupeTime) {
          return;
        }

        this.lastMessage[key] = { data: e.data, time: now };

        if (this.listeners.has(e.data.type)) {
          this.listeners.get(e.data.type).forEach(cb => cb(e.data));
        }
      });
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type).delete(callback);
  }

  send(message) {
    if (this.channel) {
      this.channel.postMessage({ ...message, timestamp: Date.now() });
    }
  }

  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

// PERFORMANCE MONITOR
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  mark(name) {
    performance.mark(name);
  }

  measure(name, startMark, endMark) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      this.metrics[name] = measure.duration;
      return measure.duration;
    } catch (e) {
      console.error('Measure error:', e);
      return 0;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  clear() {
    this.metrics = {};
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Export for use
export {
  EventEmitter,
  StateManager,
  CacheLayer,
  DOMRenderer,
  Debouncer,
  AudioPool,
  BroadcastSync,
  PerformanceMonitor
};
