// SUPABASE INTEGRATION LAYER
// Uses ONLY the anon key — safe for frontend use.
// Security is enforced by Row Level Security (RLS) policies on the database.
// See SECURITY_SETUP.md for required SQL policies.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm';
import { EventEmitter, CacheLayer, Debouncer } from './performance-core.js';

// The ANON key is safe to expose in frontend code.
// It only works within RLS policy boundaries — users can only access their own data.
// NEVER put the service_role key here. That key belongs only in server-side code.
const SUPABASE_URL = 'https://fvpedrabqhcpiifjcfik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cGVkcmFicWhjcGlpZmpjZmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTIwMzksImV4cCI6MjA5MDkyODAzOX0.VHTH80WcqX4B0q4G-q_kKAS4RHyDBVONEkRMFSTPTcc';

const BUCKET_MUSIC = 'music-files';
const BUCKET_GALLERY = 'gallery-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * DATABASE LAYER
 * All queries are automatically scoped to the authenticated user via RLS.
 */
class SupabaseDB extends EventEmitter {
  constructor() {
    super();
    this.cache = new CacheLayer('PersonalHub', 'supabase');
    this.subscriptions = new Map();
  }

  async init() {
    await this.cache.init();
  }

  async get(table, options = {}) {
    let query = supabase.from(table).select(options.select || '*');

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    if (options.order) {
      query = query.order(options.order.by, { ascending: options.order.asc !== false });
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) { console.error('DB get error:', error); return []; }
    return data;
  }

  subscribe(table, options = {}, callback) {
    const subscriptionId = `${table}:${JSON.stringify(options)}`;

    if (this.subscriptions.has(subscriptionId)) {
      const existing = this.subscriptions.get(subscriptionId);
      existing.callbacks.push(callback);
      return () => { existing.callbacks = existing.callbacks.filter(cb => cb !== callback); };
    }

    const subscription = supabase
      .channel(`realtime:${subscriptionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const { new: newData, old: oldData, eventType } = payload;
        const data = newData || oldData;

        if (options.where) {
          const matches = Object.entries(options.where).every(([k, v]) => data[k] === v);
          if (!matches) return;
        }

        const subs = this.subscriptions.get(subscriptionId);
        if (subs?.callbacks) {
          subs.callbacks.forEach(cb => cb({ eventType, data: newData, oldData }));
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setTimeout(() => this.subscribe(table, options, callback), 3000);
        }
      });

    this.subscriptions.set(subscriptionId, { subscription, callbacks: [callback] });

    return () => {
      const subs = this.subscriptions.get(subscriptionId);
      subs.callbacks = subs.callbacks.filter(cb => cb !== callback);
      if (subs.callbacks.length === 0) {
        supabase.removeChannel(subscription);
        this.subscriptions.delete(subscriptionId);
      }
    };
  }

  async create(table, data) {
    const { data: result, error } = await supabase.from(table).insert([data]).select('*').single();
    if (error) throw error;
    return result;
  }

  async update(table, id, data) {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select('*').single();
    if (error) throw error;
    return result;
  }

  async delete(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  unsubscribeAll() {
    this.subscriptions.forEach(({ subscription }) => supabase.removeChannel(subscription));
    this.subscriptions.clear();
  }
}

/**
 * STORAGE LAYER
 * Files are uploaded into user-scoped paths (userId/folder/filename) so storage
 * policies can enforce ownership. See SECURITY_SETUP.md for bucket policies.
 */
class SupabaseStorage {
  constructor(bucket) {
    this.bucket = bucket;
  }

  async upload(file, folder, onProgress) {
    // Get current user to scope the storage path
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'upload';
    const fileName = `${Date.now()}_${safeName}`;
    // Path: userId/folder/filename — userId prefix lets storage policies enforce ownership
    const filePath = `${user.id}/${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from(this.bucket).getPublicUrl(filePath);
    return { path: filePath, url: publicUrlData.publicUrl, name: fileName };
  }

  async delete(filePath) {
    const { error } = await supabase.storage.from(this.bucket).remove([filePath]);
    if (error) throw error;
  }

  async getSignedUrl(filePath, expiresIn = 3600) {
    const { data, error } = await supabase.storage.from(this.bucket).createSignedUrl(filePath, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }
}

/**
 * AUTH LAYER
 */
class SupabaseAuth {
  constructor() {
    this.user = null;
    this.listeners = new Set();
  }

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.user = data.user;
    this.notifyListeners();
    return data.user;
  }

  async signup(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    this.user = data.user;
    this.notifyListeners();
    return data.user;
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.user = null;
    this.notifyListeners();
  }

  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        this.user = null;
        this.notifyListeners();
        throw error;
      }
      this.user = user;
      return user;
    } catch (e) {
      this.user = null;
      this.notifyListeners();
      throw e;
    }
  }

  onAuthChange(callback) {
    this.listeners.add(callback);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      this.user = session?.user || null;
      this.notifyListeners();
    });
    return () => {
      this.listeners.delete(callback);
      subscription?.unsubscribe();
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.user));
  }
}

export const db = new SupabaseDB();
export const storage = {
  music: new SupabaseStorage(BUCKET_MUSIC),
  gallery: new SupabaseStorage(BUCKET_GALLERY)
};
export const auth = new SupabaseAuth();
export { supabase };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => db.init().catch(console.error));
} else {
  db.init().catch(console.error);
}
