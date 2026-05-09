'use client';

import React, { useState } from 'react';
import { createLetterAction, deleteLetterAction } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface Letter {
  id: string;
  title: string;
  content: string;
  recipient: string;
  recipient_email?: string;
  created_at: string;
}

interface LettersProps {
  letters: Letter[];
  onRefresh?: () => void;
}

export function LettersView({ letters, onRefresh }: LettersProps) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div>
      {showNew ? (
        <LetterEditor
          onSave={() => {
            setShowNew(false);
            onRefresh?.();
          }}
          onCancel={() => setShowNew(false)}
        />
      ) : (
        <button type="button" onClick={() => setShowNew(true)} className="btn-primary rose" style={{ marginBottom: '14px' }}>
          ✍️ Write New Letter
        </button>
      )}

      {letters.length > 0 ? (
        <div className="letter-cards">
          {letters.map((letter) => (
            <LetterCard key={letter.id} letter={letter} onDelete={() => onRefresh?.()} />
          ))}
        </div>
      ) : (
        !showNew && (
          <div className="empty-state">
            <div className="empty-icon">💌</div>
            <p>No letters yet. Write your first one!</p>
          </div>
        )
      )}
    </div>
  );
}

interface LetterEditorProps {
  onSave?: () => void;
  onCancel?: () => void;
}

export function LetterEditor({ onSave, onCancel }: LetterEditorProps) {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!recipientName.trim() || !content.trim()) {
      setError('Recipient name and content are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createLetterAction(recipientName.trim(), content, recipientEmail.trim() || undefined);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save letter');
      }
      onSave?.();
      setRecipientName('');
      setRecipientEmail('');
      setContent('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save letter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="field-label">Recipient name</label>
      <input
        type="text"
        value={recipientName}
        onChange={(e) => setRecipientName(e.target.value)}
        placeholder="Recipient name..."
        className="field-input"
      />

      <label className="field-label">Email (optional)</label>
      <input
        type="email"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
        placeholder="recipient@email.com"
        className="field-input"
      />

      <label className="field-label">Letter content</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your letter here..."
        rows={10}
        className="field-input"
      />

      {error ? <p className="section-sub" style={{ color: '#f87171', marginBottom: '10px' }}>{error}</p> : null}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={handleSave} disabled={loading} className="btn-primary rose">
          {loading ? 'Saving...' : 'Save Letter'}
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

interface LetterCardProps {
  letter: Letter;
  onDelete?: () => void;
}

export function LetterCard({ letter, onDelete }: LetterCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this letter?')) return;
    setDeleting(true);
    try {
      await deleteLetterAction(letter.id);
      onDelete?.();
      router.refresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="letter-card">
      <h4>{letter.title}</h4>
      <div className="letter-to">
        💌 To: {letter.recipient}
        {letter.recipient_email ? ` • ${letter.recipient_email}` : ''}
      </div>
      <p className="letter-preview">{letter.content || 'No content'}</p>

      <div className="note-footer">
        <span className="note-date">{new Date(letter.created_at).toLocaleDateString()}</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="btn-delete"
        >
          {deleting ? '...' : '✕'}
        </button>
      </div>
    </div>
  );
}
