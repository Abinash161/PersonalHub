import React, { Suspense } from 'react';
import { fetchNotes } from '@/lib/server-data';
import { NoteEditor, NoteItem } from '@/components/NoteEditor';

export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  return (
    <div>
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(234,179,8,0.12)' }}>📝</div>
        <div>
          <div className="section-title">Your Notes</div>
          <div className="section-sub">Keep your thoughts organized and accessible</div>
        </div>
      </div>

      <div className="notes-layout">
        <div className="panel">
          <div className="panel-title">✏️ Create Note</div>
          <NoteEditor />
        </div>

        <div>
          <Suspense fallback={<div className="empty-state"><p>Loading notes...</p></div>}>
            <NotesGrid />
          </Suspense>
        </div>
        </div>
      </div>
  );
}

async function NotesGrid() {
  const notes = await fetchNotes();

  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <p className="text-gray-400">No notes yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="notes-grid">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
        />
      ))}
    </div>
  );
}
