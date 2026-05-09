'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createMusicTrackAction, deleteMusicTrackAction } from '@/app/actions';
import { auth, musicStorage } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface MusicTrack {
  id: string;
  title: string;
  file_url: string;
  uploaded_at: string;
}

interface MusicPlayerProps {
  tracks: MusicTrack[];
  onTrackDeleted?: () => void;
}

export function MusicPlayer({ tracks, onTrackDeleted }: MusicPlayerProps) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(tracks[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentTrack(tracks[nextIndex]);
    setIsPlaying(true);
  };

  const handlePreviousTrack = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    setCurrentTrack(tracks[prevIndex]);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack]);

  if (tracks.length === 0) {
    return (
      <div className="rounded-lg border border-white/20 bg-white/5 p-8 text-center">
        <p className="text-gray-400">No music uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player */}
      <div className="rounded-lg border border-white/20 bg-white/4 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white line-clamp-1">{currentTrack?.title}</h3>
          <audio
            ref={audioRef}
            src={currentTrack?.file_url}
            onEnded={handleNextTrack}
            className="mb-4 w-full"
            controls
          />
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handlePreviousTrack}
            className="rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20"
          >
            ⏮️
          </button>
          <button
            onClick={handlePlayPause}
            className="rounded-lg bg-linear-to-r from-purple-600 to-pink-600 px-6 py-2 text-white transition hover:from-purple-700 hover:to-pink-700"
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button
            onClick={handleNextTrack}
            className="rounded-lg bg-white/10 px-4 py-2 text-white transition hover:bg-white/20"
          >
            ⏭️
          </button>
        </div>
      </div>

      {/* Playlist */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tracks.map((track) => (
          <MusicTrackItem
            key={track.id}
            track={track}
            isActive={currentTrack?.id === track.id}
            onSelect={() => {
              setCurrentTrack(track);
              setIsPlaying(true);
            }}
            onDelete={() => onTrackDeleted?.()}
          />
        ))}
      </div>
    </div>
  );
}

interface MusicTrackItemProps {
  track: MusicTrack;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function MusicTrackItem({ track, isActive, onSelect, onDelete }: MusicTrackItemProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this track?')) return;
    setDeleting(true);
    try {
      await deleteMusicTrackAction(track.id);
      onDelete();
      router.refresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border transition cursor-pointer ${
        isActive
          ? 'border-purple-500 bg-purple-500/20'
          : 'border-white/20 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-white line-clamp-1">{track.title}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleting}
          className="text-xs text-red-400 transition hover:text-red-300 disabled:opacity-50 ml-2"
        >
          {deleting ? '...' : '✕'}
        </button>
      </div>
    </div>
  );
}

interface MusicUploadProps {
  onUploadComplete?: () => void;
}

export function MusicUpload({ onUploadComplete }: MusicUploadProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!title.trim() || !file) {
      setError('Title and file are required');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const user = await auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const publicUrl = await musicStorage.upload(file, user.id);
      const result = await createMusicTrackAction(title, 'Unknown Artist', publicUrl);
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setTitle('');
      setFile(null);
      onUploadComplete?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/20 bg-white/5 p-4 space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Track title"
        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
      />
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full text-sm text-gray-400"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        onClick={handleUpload}
        disabled={uploading || !title.trim() || !file}
        className="w-full rounded-lg bg-linear-to-r from-purple-600 to-pink-600 px-4 py-2 font-semibold text-white transition hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload Music'}
      </button>
    </div>
  );
}
