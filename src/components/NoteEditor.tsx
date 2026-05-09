'use client';

import React, { useState } from 'react';
import { createNoteAction, deleteNoteAction, updateNoteAction } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface NoteEditorProps {
  initialNote?: Note;
  onSave?: () => void;
  onCancel?: () => void;
}

export function NoteEditor({ initialNote, onSave, onCancel }: NoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (initialNote) {
        await updateNoteAction(initialNote.id, title, content);
      } else {
        await createNoteAction(title, content);
      }
      setTitle('');
      setContent('');
      onSave?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="field-label">Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title..."
        className="field-input"
      />

      <label className="field-label">Content</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your note here..."
        rows={8}
        className="field-input"
      />

      {error ? <p className="section-sub" style={{ color: '#f87171', marginBottom: '10px' }}>{error}</p> : null}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Note'}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-delete"
            style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0 12px' }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface NoteItemProps {
  note: Note;
  onSelect?: (note: Note) => void;
  onDelete?: (id: string) => void;
}

export function NoteItem({ note, onSelect, onDelete }: NoteItemProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this note?')) return;
    setDeleting(true);
    try {
      await deleteNoteAction(note.id);
      onDelete?.(note.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div onClick={() => onSelect?.(note)} className="note-card">
      <h4>{note.title}</h4>
      <p>{note.content || 'No content'}</p>
      <div className="note-footer">
        <span className="note-date">{new Date(note.created_at).toLocaleDateString()}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleting}
          className="btn-delete"
        >
          {deleting ? '...' : '✕'}
        </button>
      </div>
    </div>
  );
}
