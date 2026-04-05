// LETTERS APP - SUPABASE OPTIMIZED
// Real-time letter composition with instant sync

import { db, auth } from './supabase-integration.js';
import { StateManager, DOMRenderer, Debouncer } from './performance-core.js';

class SupabaseLettersApp {
  constructor() {
    this.stateManager = new StateManager();
    this.renderer = new DOMRenderer();
    this.saveDebouncer = new Debouncer((letterId, content) => this.saveLetter(letterId, content), 1000);
    this.unsubscribeFuncs = [];
    this.contentEditors = new Map();
    this.currentUserId = null;
  }

  async init() {
    auth.onAuthChange((user) => {
      if (user) {
        this.currentUserId = user.id;
        this.setupLettersSync();
      } else {
        this.cleanup();
      }
    });

    try {
      const user = await auth.getUser();
      if (user) {
        this.currentUserId = user.id;
        this.setupLettersSync();
      }
    } catch (e) {
      console.error('Auth error:', e);
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const newLetterBtn = document.getElementById('newLetterBtn');
    if (newLetterBtn) {
      newLetterBtn.addEventListener('click', () => this.createNewLetter());
    }
  }

  setupLettersSync() {
    // Real-time letters subscription
    const unsubscribe = db.subscribe(
      'letters',
      {
        select: 'id, recipient, subject, content, status, created_at, updated_at, draft_id',
        filter: { where: 'sender_id', equals: this.currentUserId }
      },
      (change) => this.handleLetterChange(change)
    );

    this.unsubscribeFuncs.push(unsubscribe);
    this.loadLetters();
  }

  async loadLetters() {
    try {
      const letters = await db.get('letters', {
        filter: { where: 'sender_id', equals: this.currentUserId },
        order: { by: 'created_at', asc: false },
        select: 'id, recipient, subject, content, status, created_at, updated_at'
      });

      this.stateManager.setState({ letters });
      this.renderLetters();
    } catch (e) {
      console.error('Load letters error:', e);
    }
  }

  async handleLetterChange(change) {
    const { eventType, data } = change;
    const state = this.stateManager.getState();
    const letters = state.letters || [];

    if (eventType === 'INSERT') {
      this.stateManager.setState({ letters: [data, ...letters] });
    } else if (eventType === 'UPDATE') {
      // Don't overwrite local edits
      const updated = letters.map(letter => {
        if (letter.id === data.id && !this.contentEditors.has(letter.id)) {
          return data; // Remote update
        }
        return letter;
      });
      this.stateManager.setState({ letters: updated });
    } else if (eventType === 'DELETE') {
      const updated = letters.filter(letter => letter.id !== data.id);
      this.stateManager.setState({ letters: updated });
    }

    this.renderLetters();
  }

  renderLetters() {
    const state = this.stateManager.getState();
    const letters = state.letters || [];
    const lettersList = document.getElementById('lettersList');

    if (!lettersList) return;

    this.renderer.reconcileList(
      lettersList,
      letters,
      (el, letter) => {
        el.className = 'letterItem';
        el.dataset.letterId = letter.id;
        el.innerHTML = `
          <div class="letterMeta">
            <div>
              <input type="text" class="letterRecipient" placeholder="Recipient" value="${letter.recipient || ''}">
              <input type="text" class="letterSubject" placeholder="Subject" value="${letter.subject || ''}">
            </div>
            <div class="letterStatus">
              <select class="statusSelect">
                <option value="draft" ${letter.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="sent" ${letter.status === 'sent' ? 'selected' : ''}>Sent</option>
              </select>
              <button class="deleteLetterBtn" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <textarea class="letterContent" placeholder="Write your letter...">${letter.content || ''}</textarea>
          <div class="letterTimestamp">${this.formatDate(letter.updated_at)}</div>
        `;

        // Recipient edit
        const recipientInput = el.querySelector('.letterRecipient');
        recipientInput.addEventListener('blur', () => {
          this.updateLetter(letter.id, { recipient: recipientInput.value.trim() });
        });

        // Subject edit
        const subjectInput = el.querySelector('.letterSubject');
        subjectInput.addEventListener('blur', () => {
          this.updateLetter(letter.id, { subject: subjectInput.value.trim() });
        });

        // Content edit
        const contentArea = el.querySelector('.letterContent');
        contentArea.addEventListener('input', () => {
          this.contentEditors.set(letter.id, contentArea.value);
          this.saveDebouncer.call(letter.id, contentArea.value);
        });

        // Status change
        const statusSelect = el.querySelector('.statusSelect');
        statusSelect.addEventListener('change', () => {
          this.updateLetter(letter.id, { status: statusSelect.value });
        });

        // Delete button
        el.querySelector('.deleteLetterBtn').addEventListener('click', () => {
          if (confirm('Delete letter?')) {
            this.deleteLetter(letter.id);
          }
        });

        return el;
      },
      (letter) => letter.id
    );
  }

  async createNewLetter() {
    try {
      const letter = await db.create('letters', {
        sender_id: this.currentUserId,
        recipient: '',
        subject: 'New Letter',
        content: '',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log('✓ Letter created');
    } catch (e) {
      console.error('Create letter error:', e);
    }
  }

  async updateLetter(letterId, fields) {
    try {
      await db.update('letters', letterId, {
        ...fields,
        updated_at: new Date().toISOString()
      });

      this.contentEditors.delete(letterId);
    } catch (e) {
      console.error('Update letter error:', e);
    }
  }

  async saveLetter(letterId, content) {
    try {
      await db.update('letters', letterId, {
        content,
        updated_at: new Date().toISOString()
      });

      this.contentEditors.delete(letterId);
      console.log(`✓ Letter saved`);
    } catch (e) {
      console.error('Save letter error:', e);
    }
  }

  async deleteLetter(letterId) {
    try {
      await db.delete('letters', letterId);
      console.log('✓ Letter deleted');
    } catch (e) {
      console.error('Delete letter error:', e);
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
const lettersApp = new SupabaseLettersApp();
lettersApp.init().catch(console.error);

// Export
export { SupabaseLettersApp };
window.lettersApp = lettersApp;
