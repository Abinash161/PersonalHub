import React, { Suspense } from 'react';
import { fetchGalleryFolders, fetchAllGalleryImages } from '@/lib/server-data';
import { GalleryWorkspace } from '@/components/GalleryManager';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  return (
    <div>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>🖼️</div>
        <div>
          <div className="section-title">Gallery</div>
          <div className="section-sub">Organize and view your photos</div>
        </div>
      </div>
      <Suspense fallback={<div className="empty-state"><p>Loading your gallery...</p></div>}>
        <GalleryContent />
      </Suspense>
    </div>
  );
}

async function GalleryContent() {
  const folders = await fetchGalleryFolders();
  const images = await fetchAllGalleryImages();

  return (
    <GalleryWorkspace folders={folders} images={images} />
  );
}
