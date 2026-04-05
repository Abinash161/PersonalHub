// MUSIC APP - SUPABASE OPTIMIZED
// Real-time music sync with sub-100ms latency

import { OptimizedMusicPlayer } from './music-player-optimized.js';
import { db, storage, auth } from './supabase-integration.js';
import { StateManager, Debouncer } from './performance-core.js';

class SupabaseMusicApp {
  constructor() {
    this.player = null;
    this.stateManager = new StateManager();
    this.unsubscribeFuncs = [];
    this.uploadDebouncer = new Debouncer(() => this.syncPlaybackState(), 2000);
  }

  async init() {
    // Initialize player
    this.player = new OptimizedMusicPlayer();
    
    // Setup auth listener
    auth.onAuthChange((user) => {
      if (user) {
        this.setupMusicSync();
      } else {
        this.cleanup();
      }
    });

    // Get current user
    try {
      const user = await auth.getUser();
      if (user) {
        this.setupMusicSync();
      }
    } catch (e) {
      console.error('Auth error:', e);
    }

    this.setupEventListeners();
  }

  setupMusicSync() {
    // Real-time music tracks subscription (sub-100ms latency!)
    const unsubscribe = db.subscribe(
      'music_tracks',
      { select: 'id, title, url, duration, created_at' },
      async (change) => {
        await this.handleMusicChange(change);
      }
    );

    this.unsubscribeFuncs.push(unsubscribe);

    // Load initial playlist
    this.loadPlaylist();
  }

  async loadPlaylist() {
    try {
      const tracks = await db.get('music_tracks', {
        order: { by: 'created_at', asc: false },
        select: 'id, title, url, duration, created_at'
      });

      const playlist = tracks.map(t => ({
        id: t.id,
        title: t.title,
        url: t.url,
        duration: t.duration
      }));

      this.player.updatePlaylist(playlist);
      this.stateManager.setState({ playlist, trackCount: tracks.length });
    } catch (e) {
      console.error('Load playlist error:', e);
    }
  }

  async handleMusicChange(change) {
    const { eventType, data } = change;

    const state = this.stateManager.getState();
    const currentPlaylist = state.playlist || [];

    if (eventType === 'INSERT') {
      // New track added
      const newTrack = {
        id: data.id,
        title: data.title,
        url: data.url,
        duration: data.duration
      };
      const updated = [newTrack, ...currentPlaylist];
      this.stateManager.setState({ playlist: updated, trackCount: updated.length });
      this.player.updatePlaylist(updated);
    } else if (eventType === 'UPDATE') {
      // Track updated
      const updated = currentPlaylist.map(t =>
        t.id === data.id ? { ...t, title: data.title } : t
      );
      this.stateManager.setState({ playlist: updated });
    } else if (eventType === 'DELETE') {
      // Track deleted
      const updated = currentPlaylist.filter(t => t.id !== data.id);
      this.stateManager.setState({ playlist: updated, trackCount: updated.length });
      this.player.updatePlaylist(updated);

      // Stop if current track deleted
      if (this.player.stateManager.getState().currentTrack?.id === data.id) {
        this.player.currentAudio?.pause();
      }
    }
  }

  setupEventListeners() {
    const addMusicBtn = document.getElementById('addMusicBtn');
    const fileInput = document.getElementById('musicFile');

    if (addMusicBtn) {
      addMusicBtn.addEventListener('click', () => fileInput?.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // Track playback state
    this.player?.stateManager.on('state-change', ({ changed }) => {
      if (changed.isPlaying || changed.currentTime) {
        this.uploadDebouncer.call();
      }
    });
  }

  async handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    console.log(`Uploading ${files.length} tracks...`);

    for (const file of files) {
      try {
        // Upload to Supabase Storage
        const { url } = await storage.music.upload(file, 'tracks', (progress) => {
          console.log(`Upload progress: ${progress}%`);
        });

        // Get file duration
        const duration = await this.getAudioDuration(url);

        // Save metadata to database
        await db.create('music_tracks', {
          title: file.name.replace(/\.[^.]+$/, ''),
          url,
          duration,
          created_at: new Date().toISOString()
        });

        console.log(`✓ Uploaded: ${file.name}`);
      } catch (error) {
        console.error(`Upload failed: ${file.name}`, error);
      }
    }

    e.target.value = '';
  }

  async getAudioDuration(url) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(Math.round(audio.duration));
      });
      audio.addEventListener('error', () => resolve(0));
      audio.src = url;
    });
  }

  async syncPlaybackState() {
    const state = this.player?.stateManager.getState();
    if (!state?.currentTrack?.id) return;

    try {
      // Store playback state in Supabase for cross-device sync
      const user = await auth.getUser();
      if (!user) return;

      await db.update('music_tracks', state.currentTrack.id, {
        last_played_at: new Date().toISOString(),
        last_played_time: state.currentTime || 0
      });
    } catch (e) {
      console.error('Sync error:', e);
    }
  }

  cleanup() {
    this.unsubscribeFuncs.forEach(fn => fn?.());
    this.unsubscribeFuncs = [];
    this.uploadDebouncer.cancel();
  }

  destroy() {
    this.cleanup();
    this.player?.destroy();
  }
}

// Auto-initialize
const musicApp = new SupabaseMusicApp();
musicApp.init().catch(console.error);

// Export
export { SupabaseMusicApp };
window.musicApp = musicApp;
