import React from 'react';
import Link from 'next/link';
import {
  fetchAllGalleryImages,
  fetchLetters,
  fetchMusicTracks,
  fetchNotes,
  getCurrentUserEmail,
} from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userEmail = await getCurrentUserEmail();
  const [notes, tracks, photos, letters] = await Promise.all([
    fetchNotes(),
    fetchMusicTracks(),
    fetchAllGalleryImages(),
    fetchLetters(),
  ]);

  const apps = [
    { href: '/dashboard/notes', icon: '📝', title: 'Notes', desc: 'Capture thoughts and ideas', color: 'yellow' },
    { href: '/dashboard/music', icon: '🎵', title: 'Music', desc: 'Your personal music library', color: 'purple' },
    { href: '/dashboard/gallery', icon: '🖼️', title: 'Gallery', desc: 'Photos organized beautifully', color: 'blue' },
    { href: '/dashboard/letters', icon: '💌', title: 'Letters', desc: 'Write and save your letters', color: 'rose' },
  ];

  return (
    <div>
      <div className="hero">
        <div className="hero-eyebrow">Your personal space</div>
        <h1>
          Welcome back,
          <br />
          <span>let&apos;s get started</span>
        </h1>
        <p>
          {userEmail
            ? `${userEmail} • Everything you need, beautifully organized in one place.`
            : 'Everything you need, beautifully organized in one place.'}
        </p>
      </div>

      <div className="app-grid">
        {apps.map((app) => (
          <Link key={app.href} href={app.href} className="app-card" data-color={app.color}>
            <div className="app-card-icon">{app.icon}</div>
            <h3>{app.title}</h3>
            <p>{app.desc}</p>
            <div className="app-card-arrow">→</div>
          </Link>
        ))}
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <p>{notes.length}</p>
            <span>Notes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎵</div>
          <div className="stat-info">
            <p>{tracks.length}</p>
            <span>Tracks</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🖼️</div>
          <div className="stat-info">
            <p>{photos.length}</p>
            <span>Photos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💌</div>
          <div className="stat-info">
            <p>{letters.length}</p>
            <span>Letters</span>
          </div>
        </div>
      </div>
    </div>
  );
}
