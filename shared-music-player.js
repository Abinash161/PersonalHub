// Seamless Music Player - Auto-plays on all pages
// Automatically creates audio element and syncs playback across pages
// Optimized for fast loading with URL caching

(function() {
  'use strict';

  let audio = null;
  let lastTitle = '';
  let lastUrl = '';
  let lastIsPlaying = false;
  let urlCache ={}; // Cache URLs for faster access
  let lastSyncTime = 0;

  // Faster URL resolution with caching
  async function resolveUrl(url) {
    if (urlCache[url] && (Date.now() - urlCache[url].timestamp) < 3600000) {
      return urlCache[url].resolved; // Return cached for 1 hour
    }
    
    // If URL already looks like a full URL, return it directly
    if (url.startsWith('http')) {
      urlCache[url] = { resolved: url, timestamp: Date.now() };
      return url;
    }
    
    return url;
  }

  // Create audio element and start playing
  async function createAndPlayAudio(url, title, shouldPlay = true) {
    try {
      // Resolve URL with caching (skip network call if possible)
      const resolvedUrl = await resolveUrl(url);
      
      // Skip if same URL already playing and no need to change state
      if (audio && audio.src === resolvedUrl && shouldPlay === !audio.paused) {
        return true;
      }
      
      // If we have audio playing the same track, just pause/play
      if (audio && audio.src === resolvedUrl) {
        if (shouldPlay && audio.paused) {
          audio.play().catch(() => {});
        } else if (!shouldPlay && !audio.paused) {
          audio.pause();
        }
        return true;
      }

      // Clean up old audio
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.remove();
      }

      // Create audio element with optimal settings
      audio = document.createElement('audio');
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto'; // Load immediately for speed
      
      // Auto-play next track when current ends
      audio.addEventListener('ended', () => {
        playNextTrack();
      });
      
      // Update UI on play/pause
      audio.addEventListener('play', () => {
        updateNowPlaying(true);
        localStorage.setItem('music_is_playing', 'true');
      });
      
      audio.addEventListener('pause', () => {
        updateNowPlaying(false);
        localStorage.setItem('music_is_playing', 'false');
      });

      audio.addEventListener('canplay', () => {
        // Audio is ready to play
        if (shouldPlay && audio.paused) {
          audio.play().catch(() => {});
        }
      });
      
      // Optimize by reducing timeupdate saves
      let lastTimeSave = 0;
      audio.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (!audio.paused && now - lastTimeSave > 500) {
          lastTimeSave = now;
          localStorage.setItem('music_last_track_time', String(audio.currentTime));
        }
      });
      
      document.body.appendChild(audio);

      // Set source and play
      audio.src = resolvedUrl;
      audio.load();
      
      // Restore playback position from localStorage
      const savedTime = parseFloat(localStorage.getItem('music_last_track_time') || '0');
      audio.addEventListener('loadedmetadata', () => {
        if (savedTime > 0 && savedTime < audio.duration) {
          audio.currentTime = savedTime;
        }
      }, { once: true });
      
      if (shouldPlay) {
        // Try to play immediately, then again when ready
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('Autoplay blocked, will retry on user interaction:', err);
          });
        }
      }
      
      lastUrl = resolvedUrl;
      return true;
    } catch (err) {
      console.error('Error creating audio:', err);
      return false;
    }
  }

  // Update now-playing bar UI
  function updateNowPlaying(isPlaying = null) {
    let nowPlayingBar = document.getElementById('nowPlaying');
    let nowPlayingTitle = document.getElementById('nowPlayingTitle');
    const playPauseBtn = document.getElementById('playPauseBtn');
    
    // If bar doesn't exist, create it dynamically
    if (!nowPlayingBar) {
      console.warn('Music bar not found on page, attempting to create...');
      return; // Will retry via polling
    }
    
    if (!nowPlayingTitle) {
      console.warn('Music title element not found');
      return;
    }

    const title = localStorage.getItem('music_last_track_title') || 'Nothing playing';
    const playing = isPlaying !== null ? isPlaying : localStorage.getItem('music_is_playing') === 'true';

    // Always update - don't skip
    lastTitle = title;
    lastIsPlaying = playing;

    nowPlayingTitle.textContent = title;
    
    if (playing && localStorage.getItem('music_last_track_url')) {
      nowPlayingBar.classList.add('active');
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
      nowPlayingBar.classList.remove('active');
      if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
  }

  // Play next track
  function playNextTrack() {
    const playlistJson = localStorage.getItem('music_playlist');
    if (!playlistJson) return;
    
    try {
      const playlist = JSON.parse(playlistJson);
      const currentUrl = localStorage.getItem('music_last_track_url');
      const currentIndex = playlist.findIndex(track => currentUrl && currentUrl.includes(track.url));
      
      if (currentIndex >= 0 && currentIndex < playlist.length - 1) {
        const nextTrack = playlist[currentIndex + 1];
        localStorage.setItem('music_last_track_url', nextTrack.url);
        localStorage.setItem('music_last_track_title', nextTrack.title);
        localStorage.setItem('music_is_playing', 'true');
        createAndPlayAudio(nextTrack.url, nextTrack.title, true);
      }
    } catch (e) {
      console.error('Error playing next track:', e);
    }
  }

  // Sync with localStorage state
  async function syncFromLocalStorage() {
    const url = localStorage.getItem('music_last_track_url');
    const title = localStorage.getItem('music_last_track_title');
    const shouldPlay = localStorage.getItem('music_is_playing') === 'true';

    if (!url || !title) {
      updateNowPlaying(false);
      return;
    }

    // ALWAYS try to keep audio in sync - aggressive approach
    // Don't check time - just sync on every poll
    await createAndPlayAudio(url, title, shouldPlay);
    
    // Update UI immediately after
    updateNowPlaying(shouldPlay);
  }

  // Play previous track
  function playPreviousTrack() {
    const playlistJson = localStorage.getItem('music_playlist');
    if (!playlistJson) return;
    
    try {
      const playlist = JSON.parse(playlistJson);
      const currentUrl = localStorage.getItem('music_last_track_url');
      const currentIndex = playlist.findIndex(track => currentUrl && currentUrl.includes(track.url));
      
      if (currentIndex > 0) {
        const prevTrack = playlist[currentIndex - 1];
        localStorage.setItem('music_last_track_url', prevTrack.url);
        localStorage.setItem('music_last_track_title', prevTrack.title);
        localStorage.setItem('music_is_playing', 'true');
        localStorage.setItem('music_last_track_time', '0');
        createAndPlayAudio(prevTrack.url, prevTrack.title, true);
      }
    } catch (e) {
      console.error('Error playing previous track:', e);
    }
  }

  // Setup controls event listener
  function setupControls() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (audio) {
          if (audio.paused) {
            audio.play().catch(() => {});
            localStorage.setItem('music_is_playing', 'true');
          } else {
            audio.pause();
            localStorage.setItem('music_is_playing', 'false');
          }
          updateNowPlaying();
        }
      });
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', playPreviousTrack);
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', playNextTrack);
    }
  }

  // Initialize on page load
  function init() {
    function doInit() {
      // Force immediate update even if elements weren't found
      updateNowPlaying();
      syncFromLocalStorage();
      setupControls();
      
      // Re-check in case elements weren't ready
      setTimeout(() => {
        if (!document.getElementById('nowPlaying')) return;
        updateNowPlaying();
        syncFromLocalStorage();
      }, 100);
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doInit);
    } else {
      doInit();
    }
  }

  // Sync on storage changes (from other tabs/pages)
  window.addEventListener('storage', (e) => {
    if (e.key === 'music_last_track_url' || e.key === 'music_is_playing' || e.key === 'music_last_track_title') {
      syncFromLocalStorage();
    }
  });

  // Continuous polling for sync (fallback)
  setInterval(syncFromLocalStorage, 300);

  // BroadcastChannel for instant cross-tab communication
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('music_sync');
    channel.addEventListener('message', (e) => {
      if (e.data.type === 'STATE_UPDATE') {
        // Update localStorage with latest state
        if (e.data.currentTime !== undefined) {
          localStorage.setItem('music_last_track_time', String(e.data.currentTime));
        }
        syncFromLocalStorage();
      }
    });
  }

  // Start
  init();
})();
