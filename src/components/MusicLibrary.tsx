'use client';

import React, { useMemo, useState } from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { createMusicTrackAction } from '@/app/actions';
import { auth, musicStorage } from '@/lib/supabase';

function formatDuration(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function MusicLibrary() {
  const { tracks, currentTrack, isPlaying, loading, error, playTrack, refreshTracks } = useMusic();

  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const hasTracks = tracks.length > 0;

  const sortedTracks = useMemo(() => {
    return [...tracks];
  }, [tracks]);

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      setUploadError('Title and file are required');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const user = await auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const publicUrl = await musicStorage.upload(file, user.id);
      const result = await createMusicTrackAction(title.trim(), 'Unknown Artist', publicUrl);
      if (!result.success) throw new Error(result.error || 'Upload failed');

      setTitle('');
      setFile(null);
      await refreshTracks();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="music-layout">
      <div className="panel">
        <div className="panel-title">☁️ Upload Track</div>

        <label className="field-label">Track title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Night Drive"
          className="field-input"
        />

        <label className="field-label">Audio file</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="field-input"
          style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer' }}
        />

        {uploadError ? <p className="section-sub" style={{ color: '#f87171', marginBottom: '10px' }}>{uploadError}</p> : null}

        <button type="button" onClick={handleUpload} disabled={uploading || !title.trim() || !file} className="btn-primary">
          {uploading ? 'Uploading...' : 'Upload Track'}
        </button>

        {currentTrack ? (
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', marginBottom: '4px' }}>Now Playing</p>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>{currentTrack.title}</p>
            <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
              Use the player above to control playback from any page
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>Your tracks</span>
          <span className="badge badge-purple">{tracks.length} tracks</span>
        </div>

        {loading ? <div className="empty-state"><p>Loading your music...</p></div> : null}
        {!loading && (error || uploadError) ? <div className="empty-state"><p>{error || uploadError}</p></div> : null}

        {!loading && !hasTracks && !error ? (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <p>No music yet</p>
            <span>Upload a track to start playing.</span>
          </div>
        ) : null}

        {!loading && hasTracks ? (
          <div className="track-list">
            {sortedTracks.map((track, index) => {
              const active = currentTrack?.id === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => playTrack(track)}
                  className={`track-card${active ? ' playing' : ''}`}
                >
                  <div className="track-num">
                    {active && isPlaying ? (
                      <div className="playing-bars"><div className="bar" /><div className="bar" /><div className="bar" /></div>
                    ) : (
                      String(index + 1).padStart(2, '0')
                    )}
                  </div>
                  <div className="track-info">
                    <p>{track.title || 'Untitled'}</p>
                    <span>{track.artist || 'Unknown Artist'}</span>
                  </div>
                  <span className="track-dur">{formatDuration(track.duration ?? 0)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
