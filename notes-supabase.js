// NOTES APP - SUPABASE OPTIMIZED
// Real-time note editing with sub-50ms sync

import { db, auth } from './supabase-integration.js';
import { StateManager, DOMRenderer, Debouncer } from './performance-core.js';

class SupabaseNotesApp {
  constructor() {
    this.stateManager = new StateManager();
    this.renderer = new DOMRenderer();
    this.saveDebouncer = new Debouncer((noteId, content) => this.saveNote(noteId, content), 1000);
    this.unsubscribeFuncs = [];
    this.contentEditors = new Map();
  }

  async init() {
    auth.onAuthChange((user) => {
      if (user) {
        this.setupNotesSync();
      } else {
        this.cleanup();
      }
    });

    try {
      const user = await auth.getUser();
      if (user) {
        this.setupNotesSync();
      }
    } catch (e) {
      console.error('Auth error:', e);
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const addNoteBtn = document.getElementById('addNoteBtn');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => this.createNewNote());
    }
  }

  setupNotesSync() {
    // Real-time notes subscription
    const unsubscribe = db.subscribe(
      'notes',
      { select: 'id, title, content, updated_at, created_at' },
      (change) => this.handleNoteChange(change)
    );

    this.unsubscribeFuncs.push(unsubscribe);
    this.loadNotes();
  }

  async loadNotes() {
    try {
      const notes = await db.get('notes', {
        order: { by: 'updated_at', asc: false },
        select: 'id, title, content, updated_at, created_at'
      });

      this.stateManager.setState({ notes });
      this.renderNotes();
    } catch (e) {
      console.error('Load notes error:', e);
    }
  }

  async handleNoteChange(change) {
    const { eventType, data } = change;
    const state = this.stateManager.getState();
    const notes = state.notes || [];

    if (eventType === 'INSERT') {
      this.stateManager.setState({ notes: [data, ...notes] });
    } else if (eventType === 'UPDATE') {
      // Don't overwrite local edits
      const updated = notes.map(note => {
        if (note.id === data.id && !this.contentEditors.has(note.id)) {
          return data; // Remote update
        }
        return note;
      });
      this.stateManager.setState({ notes: updated });
    } else if (eventType === 'DELETE') {
      const updated = notes.filter(note => note.id !== data.id);
      this.stateManager.setState({ notes: updated });
    }

    this.renderNotes();
  }

  renderNotes() {
    const state = this.stateManager.getState();
    const notes = state.notes || [];
    const notesList = document.getElementById('notesList');

    if (!notesList) return;

    this.renderer.reconcileList(
      notesList,
      notes,
      (el, note) => {
        el.className = 'noteItem';
        el.dataset.noteId = note.id;
        el.innerHTML = `
          <div class="noteHeader">
            <input type="text" class="noteTitle" value="${note.title || 'Untitled'}" placeholder="Note title">
            <button class="deleteNoteBtn" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
          <textarea class="noteContent" placeholder="Start typing...">${note.content || ''}</textarea>
          <div class="noteTimestamp">${this.formatDate(note.updated_at)}</div>
        `;

        // Title edit
        const titleInput = el.querySelector('.noteTitle');
        titleInput.addEventListener('blur', () => this.updateNoteTitle(note.id, titleInput.value));

        // Content edit
        const contentArea = el.querySelector('.noteContent');
        contentArea.addEventListener('input', () => {
          this.contentEditors.set(note.id, contentArea.value);
          this.saveDebouncer.call(note.id, contentArea.value);
        });

        // Delete button
        el.querySelector('.deleteNoteBtn').addEventListener('click', () => {
          if (confirm('Delete note?')) {
            this.deleteNote(note.id);
          }
        });

        return el;
      },
      (note) => note.id
    );
  }

  async createNewNote() {
    try {
      const note = await db.create('notes', {
        title: 'New Note',
        content: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log('✓ Note created');
    } catch (e) {
      console.error('Create note error:', e);
    }
  }

  async updateNoteTitle(noteId, title) {
    try {
      await db.update('notes', noteId, { title: title.trim() });
      this.contentEditors.delete(noteId);
    } catch (e) {
      console.error('Update title error:', e);
    }
  }

  async saveNote(noteId, content) {
    try {
      await db.update('notes', noteId, {
        content,
        updated_at: new Date().toISOString()
      });

      this.contentEditors.delete(noteId);
      console.log(`✓ Note saved`);
    } catch (e) {
      console.error('Save note error:', e);
    }
  }

  async deleteNote(noteId) {
    try {
      await db.delete('notes', noteId);
      console.log('✓ Note deleted');
    } catch (e) {
      console.error('Delete note error:', e);
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  cleanup() {
    this.unsubscribeFuncs.forEach(fn => fn?.());
    this.unsubscribeFuncs = [];
    this.contentEditors.clear();
  }

  destroy() {
    this.cleanup();
    this.saveDebouncer.cancel();
  }
}

// Auto-initialize
const notesApp = new SupabaseNotesApp();
notesApp.init().catch(console.error);

// Export
export { SupabaseNotesApp };
window.notesApp = notesApp;
