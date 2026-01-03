// Seamless persistent music player across all pages
// Maintains continuous playback without interruption during page switches

class SeamlessMusicPlayer {
  constructor() {
    this.audio = null;
    this.syncInterval = null;
    this.lastSync = 0;
    this.channel = null;
    this.init();
  }

  init() {
    // On music.html, only manage broadcasting - don't create synced audio
    if (window.location.pathname.includes('music.html')) {
      this.setupMusicPageSync();
      return;
    }

    // On other pages, create synced audio element
    this.setupSyncedPlayer();
  }

  setupMusicPageSync() {
    // Create BroadcastChannel for cross-page communication
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('music_sync');
      
      // Listen for sync requests from other pages
      this.channel.addEventListener('message', (e) => {
        if (e.data.type === 'SYNC_REQUEST') {
          this.broadcastCurrentState();
        } else if (e.data.type === 'PLAY_COMMAND') {
          if (window.currentAudio) window.currentAudio.play().catch(() => {});
        } else if (e.data.type === 'PAUSE_COMMAND') {
          if (window.currentAudio) window.currentAudio.pause();
        } else if (e.data.type === 'NEXT_COMMAND') {
          // Play next track
          if (window.currentAudio) {
            const allAudios = Array.from(document.querySelectorAll('#musicList audio'));
            const currentIndex = allAudios.indexOf(window.currentAudio);
            const next = allAudios[currentIndex + 1];
            if (next) {
              window.currentAudio.pause();
              next.play().catch(() => {});
            }
          }
        } else if (e.data.type === 'PREV_COMMAND') {
          // Play previous track
          if (window.currentAudio) {
            const allAudios = Array.from(document.querySelectorAll('#musicList audio'));
            const currentIndex = allAudios.indexOf(window.currentAudio);
            const prev = allAudios[currentIndex - 1];
            if (prev) {
              window.currentAudio.pause();
              prev.play().catch(() => {});
            }
          }
        }
      });
    }

    // Broadcast state less frequently to reduce overhead (every 2 seconds when playing)
    setInterval(() => {
      this.broadcastCurrentState();
    }, 2000);
  }

  broadcastCurrentState() {
    if (!this.channel) return;
    
    const title = localStorage.getItem('music_last_track_title');
    const url = localStorage.getItem('music_last_track_url');
    const time = localStorage.getItem('music_last_track_time');
    const playing = localStorage.getItem('music_was_playing') === 'true';
    
    if (url && title) {
      this.channel.postMessage({
        type: 'STATE_UPDATE',
        url: url,
        title: title,
        currentTime: parseFloat(time || '0'),
        isPlaying: playing,
        timestamp: Date.now()
      });
    }
  }

  setupSyncedPlayer() {
    const lastUrl = localStorage.getItem('music_last_track_url');
    const lastTitle = localStorage.getItem('music_last_track_title');
    const lastTime = parseFloat(localStorage.getItem('music_last_track_time') || '0');
    const wasPlaying = localStorage.getItem('music_was_playing') === 'true';

    // Create audio immediately if we have a track
    if (lastUrl) {
      this.createAudioElement(lastUrl, lastTime, wasPlaying);
      this.updateNowPlayingBar(lastTitle, wasPlaying);
    }

    // Setup BroadcastChannel for syncing
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('music_sync');
      
      this.channel.addEventListener('message', (e) => {
        if (e.data.type === 'STATE_UPDATE') {
          this.syncWithState(e.data);
        }
      });

      // Request immediate sync
      this.channel.postMessage({ type: 'SYNC_REQUEST' });
    }

    // Setup controls
    this.setupControls();
  }

  syncWithState(state) {
    if (!state.url) return;

    // Update now playing display
    this.updateNowPlayingBar(state.title, state.isPlaying);

    // Create or sync audio element
    if (!this.audio || !this.audio.src.includes(state.url)) {
      // Different track - create new audio and sync time
      this.createAudioElement(state.url, state.currentTime, state.isPlaying);
    } else {
      // Same track - ONLY sync play/pause, NEVER sync time during playback
      // This prevents all backward jumps and flickers
      if (state.isPlaying && this.audio.paused) {
        this.audio.play().catch(() => {});
      } else if (!state.isPlaying && !this.audio.paused) {
        this.audio.pause();
      }
    }
  }

  createAudioElement(url, startTime = 0, shouldPlay = false) {
    // Don't destroy existing audio if it's the same source
    if (this.audio && this.audio.src.includes(url)) {
      // Never adjust time on existing audio to prevent jumps
      if (shouldPlay && this.audio.paused) {
        this.audio.play().catch(() => {});
      }
      return;
    }

    // Store old audio to smoothly transition
    const oldAudio = this.audio;
    
    this.audio = document.createElement('audio');
    this.audio.src = url;
    this.audio.preload = 'auto';
    
    // Try to set time immediately if we have it cached
    if (startTime > 0) {
      this.audio.currentTime = startTime;
    }
    
    this.audio.addEventListener('loadedmetadata', () => {
      if (startTime > 0 && startTime < this.audio.duration) {
        this.audio.currentTime = startTime;
      }
      
      if (shouldPlay) {
        this.audio.play().catch(() => {});
        
        // Fade out old audio if it exists
        if (oldAudio && !oldAudio.paused) {
          const fadeOut = setInterval(() => {
            if (oldAudio.volume > 0.1) {
              oldAudio.volume -= 0.1;
            } else {
              oldAudio.pause();
              oldAudio.remove();
              clearInterval(fadeOut);
            }
          }, 50);
        }
      } else if (oldAudio) {
        oldAudio.pause();
        oldAudio.remove();
      }
    }, { once: true });

    this.audio.addEventListener('canplaythrough', () => {
      // Audio is ready, can play smoothly
      if (shouldPlay && this.audio.paused) {
        this.audio.play().catch(() => {});
      }
    }, { once: true });

    this.audio.addEventListener('play', () => {
      this.updateNowPlayingBar(localStorage.getItem('music_last_track_title'), true);
    });

    this.audio.addEventListener('pause', () => {
      this.updateNowPlayingBar(localStorage.getItem('music_last_track_title'), false);
    });

    // Auto-play next track when current one ends
    this.audio.addEventListener('ended', () => {
      // Get playlist from localStorage
      const playlistJson = localStorage.getItem('music_playlist');
      if (!playlistJson) return;
      
      try {
        const playlist = JSON.parse(playlistJson);
        const currentUrl = localStorage.getItem('music_last_track_url');
        
        // Find current track index
        const currentIndex = playlist.findIndex(track => currentUrl && currentUrl.includes(track.url));
        
        // Play next track if available
        if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
          const nextTrack = playlist[currentIndex + 1];
          localStorage.setItem('music_last_track_url', nextTrack.url);
          localStorage.setItem('music_last_track_title', nextTrack.title);
          localStorage.setItem('music_last_track_time', '0');
          localStorage.setItem('music_was_playing', 'true');
          
          // Create new audio element for next track
          this.createAudioElement(nextTrack.url, 0, true);
          this.updateNowPlayingBar(nextTrack.title, true);
          
          // Notify music.html to sync if it's open
          if (this.channel) {
            this.channel.postMessage({ type: 'NEXT_COMMAND' });
          }
        }
      } catch (e) {
        console.error('Error parsing playlist:', e);
      }
    });

    // Sync time periodically (only when playing)
    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio.paused) {
        const now = Date.now();
        // Update localStorage every 2 seconds instead of 1
        if (now - this.lastSync > 2000) {
          this.lastSync = now;
          localStorage.setItem('music_last_track_time', String(this.audio.currentTime));
        }
      }
    });

    document.body.appendChild(this.audio);
  }

  updateNowPlayingBar(title, isPlaying) {
    const nowPlaying = document.getElementById('nowPlaying');
    const nowPlayingTitle = document.getElementById('nowPlayingTitle');
    const playPauseBtn = document.getElementById('playPauseBtn');

    if (nowPlaying && title) {
      nowPlaying.classList.add('active');
      nowPlayingTitle.textContent = '🎵 ' + title;
    }

    if (playPauseBtn) {
      playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
  }

  setupControls() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (this.channel) {
          // Send command to music.html if it exists
          this.channel.postMessage({ 
            type: this.audio && !this.audio.paused ? 'PAUSE_COMMAND' : 'PLAY_COMMAND'
          });
        }
        
        // Also control local audio
        if (this.audio) {
          if (this.audio.paused) {
            this.audio.play().catch(() => {});
          } else {
            this.audio.pause();
          }
        }
      });
    }

    // Next button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.channel) {
          this.channel.postMessage({ type: 'NEXT_COMMAND' });
        }
      });
    }

    // Previous button
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.channel) {
          this.channel.postMessage({ type: 'PREV_COMMAND' });
        }
      });
    }
  }
}

// Initialize immediately when script loads, not waiting for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.seamlessMusicPlayer = new SeamlessMusicPlayer();
  });
} else {
  // DOM already loaded, initialize now
  window.seamlessMusicPlayer = new SeamlessMusicPlayer();
}



