// GALLERY APP - SUPABASE OPTIMIZED
// Real-time image gallery with instant sync

import { db, storage, auth } from './supabase-integration.js';
import { StateManager, DOMRenderer, Debouncer } from './performance-core.js';

class SupabaseGalleryApp {
  constructor() {
    this.stateManager = new StateManager();
    this.renderer = new DOMRenderer();
    this.layoutDebouncer = new Debouncer(() => this.applyLayout(), 200);
    this.unsubscribeFuncs = [];
    this.currentFolder = null;
  }

  async init() {
    auth.onAuthChange((user) => {
      if (user) {
        this.setupFolderSync();
      } else {
        this.cleanup();
      }
    });

    try {
      const user = await auth.getUser();
      if (user) {
        this.setupFolderSync();
      }
    } catch (e) {
      console.error('Auth error:', e);
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const createFolderBtn = document.getElementById('createFolderBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const backBtn = document.getElementById('backBtn');
    const imageFile = document.getElementById('imageFile');

    if (createFolderBtn) {
      createFolderBtn.addEventListener('click', () => this.openCreateFolderDialog());
    }

    if (cameraBtn) {
      cameraBtn.addEventListener('click', () => this.openCamera());
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.goBack());
    }

    if (imageFile) {
      imageFile.addEventListener('change', (e) => this.handleImageUpload(e));
    }
  }

  setupFolderSync() {
    // Real-time folder subscription
    const unsubscribe = db.subscribe(
      'gallery_folders',
      { select: 'id, name, created_at' },
      (change) => this.handleFolderChange(change)
    );

    this.unsubscribeFuncs.push(unsubscribe);
    this.loadFolders();
  }

  async loadFolders() {
    try {
      const folders = await db.get('gallery_folders', {
        order: { by: 'created_at', asc: false },
        select: 'id, name, created_at'
      });

      this.stateManager.setState({ folders });
      this.renderFolders();
    } catch (e) {
      console.error('Load folders error:', e);
    }
  }

  async handleFolderChange(change) {
    const { eventType, data } = change;
    const state = this.stateManager.getState();
    const folders = state.folders || [];

    if (eventType === 'INSERT') {
      this.stateManager.setState({ folders: [data, ...folders] });
    } else if (eventType === 'UPDATE') {
      const updated = folders.map(f => f.id === data.id ? data : f);
      this.stateManager.setState({ folders: updated });
    } else if (eventType === 'DELETE') {
      const updated = folders.filter(f => f.id !== data.id);
      this.stateManager.setState({ folders: updated });

      if (this.currentFolder === data.id) {
        this.goBack();
      }
    }

    this.renderFolders();
  }

  renderFolders() {
    const state = this.stateManager.getState();
    const folders = state.folders || [];
    const foldersList = document.getElementById('foldersList');

    if (!foldersList) return;

    this.renderer.reconcileList(
      foldersList,
      folders,
      (el, folder) => {
        el.className = 'folderItem' + (this.currentFolder === folder.id ? ' active' : '');
        el.dataset.folderId = folder.id;
        el.innerHTML = `
          <button class="folderMenuBtn" title="Menu"><i class="fas fa-ellipsis-v"></i></button>
          <span class="folderIcon"><i class="fas fa-folder"></i></span>
          <span class="folderName">${folder.name}</span>
        `;

        el.querySelector('.folderMenuBtn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.showFolderMenu(folder);
        });

        el.addEventListener('click', () => this.openFolder(folder.id));

        return el;
      },
      (folder) => folder.id
    );
  }

  async openFolder(folderId) {
    this.currentFolder = folderId;
    this.setupImagesSync();

    // Update UI
    document.getElementById('foldersList')?.classList.add('hidden');
    document.getElementById('galleryList')?.classList.remove('hidden');
    document.getElementById('backBtn').style.display = 'flex';
    document.getElementById('cameraBtn').style.display = 'flex';
  }

  async setupImagesSync() {
    // Remove old subscription
    if (this.imageUnsubscribe) this.imageUnsubscribe();

    // Real-time images subscription for current folder
    this.imageUnsubscribe = db.subscribe(
      'gallery_images',
      { where: { folder_id: this.currentFolder }, select: 'id, url, folder_id, created_at' },
      (change) => this.handleImageChange(change)
    );

    this.unsubscribeFuncs.push(this.imageUnsubscribe);
    this.loadImages();
  }

  async loadImages() {
    try {
      const images = await db.get('gallery_images', {
        where: { folder_id: this.currentFolder },
        order: { by: 'created_at', asc: false },
        select: 'id, url, folder_id, created_at'
      });

      this.stateManager.setState({ images });
      this.renderImages();
    } catch (e) {
      console.error('Load images error:', e);
    }
  }

  async handleImageChange(change) {
    const { eventType, data } = change;
    const state = this.stateManager.getState();
    const images = state.images || [];

    if (eventType === 'INSERT') {
      this.stateManager.setState({ images: [data, ...images] });
    } else if (eventType === 'UPDATE') {
      const updated = images.map(img => img.id === data.id ? data : img);
      this.stateManager.setState({ images: updated });
    } else if (eventType === 'DELETE') {
      const updated = images.filter(img => img.id !== data.id);
      this.stateManager.setState({ images: updated });
    }

    this.renderImages();
  }

  renderImages() {
    const state = this.stateManager.getState();
    const images = state.images || [];
    const galleryList = document.getElementById('galleryList');

    if (!galleryList) return;

    this.renderer.reconcileList(
      galleryList,
      images,
      (el, image) => {
        el.className = 'galleryItem';
        el.dataset.imageId = image.id;
        el.innerHTML = `
          <img class="loading" src="${image.url}" alt="Gallery" loading="lazy" data-src="${image.url}">
          <button class="crossBtn" data-image-id="${image.id}" title="Delete">×</button>
        `;

        // Lazy load
        const img = el.querySelector('img');
        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => img.classList.remove('loading');
                observer.unobserve(img);
              }
            });
          });
          observer.observe(img);
        }

        // Delete button
        el.querySelector('.crossBtn').addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.deleteImage(image.id);
        });

        // Fullscreen
        img.addEventListener('click', () => this.showFullscreen(image.url));

        return el;
      },
      (image) => image.id
    );

    this.layoutDebouncer.call();
  }

  async deleteImage(imageId) {
    try {
      // Get image URL to delete from storage
      const state = this.stateManager.getState();
      const image = (state.images || []).find(img => img.id === imageId);

      if (image) {
        // Delete from storage
        const path = image.url.split(`/${this.currentFolder}/`)[1];
        try {
          await storage.gallery.delete(`${this.currentFolder}/${path}`);
        } catch (e) {
          console.warn('Storage deletion warning:', e);
        }
      }

      // Delete from database
      await db.delete('gallery_images', imageId);
    } catch (e) {
      console.error('Delete error:', e);
    }
  }

  async handleImageUpload(e) {
    if (!this.currentFolder) return;

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    console.log(`Uploading ${files.length} images to folder ${this.currentFolder}...`);

    for (const file of files) {
      try {
        const { url } = await storage.gallery.upload(
          file,
          this.currentFolder,
          (progress) => console.log(`Progress: ${progress}%`)
        );

        // Save metadata
        await db.create('gallery_images', {
          folder_id: this.currentFolder,
          url,
          created_at: new Date().toISOString()
        });

        console.log(`✓ Uploaded: ${file.name}`);
      } catch (error) {
        console.error(`Upload failed: ${file.name}`, error);
      }
    }

    e.target.value = '';
  }

  async openCreateFolderDialog() {
    const name = prompt('Folder name:');
    if (!name) return;

    try {
      await db.create('gallery_folders', {
        name: name.trim(),
        created_at: new Date().toISOString()
      });

      console.log(`✓ Folder created: ${name}`);
    } catch (e) {
      console.error('Folder creation error:', e);
    }
  }

  showFolderMenu(folder) {
    const actions = {
      'rename': async () => {
        const newName = prompt('New name:', folder.name);
        if (newName) {
          try {
            await db.update('gallery_folders', folder.id, { name: newName.trim() });
          } catch (e) {
            console.error('Rename error:', e);
          }
        }
      },
      'delete': async () => {
        if (!confirm('Delete folder and all images?')) return;

        try {
          // Delete all images in folder
          const images = await db.get('gallery_images', {
            where: { folder_id: folder.id }
          });

          for (const img of images) {
            await this.deleteImage(img.id);
          }

          // Delete folder
          await db.delete('gallery_folders', folder.id);
          console.log(`✓ Folder deleted: ${folder.name}`);
        } catch (e) {
          console.error('Delete error:', e);
        }
      }
    };

    const action = prompt(`[R]ename or [D]elete "${folder.name}"?`).toLowerCase();
    if (action === 'r') actions.rename();
    else if (action === 'd') actions.delete();
  }

  async openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera not supported');
      return;
    }

    let usingFront = true;
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');

      video.srcObject = stream;
      await video.play();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capture photo
      const capturePhoto = () => {
        if (usingFront) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          try {
            const { url } = await storage.gallery.upload(
              blob,
              this.currentFolder,
              (progress) => console.log(`Camera upload: ${progress}%`)
            );

            await db.create('gallery_images', {
              folder_id: this.currentFolder,
              url,
              created_at: new Date().toISOString()
            });

            console.log('✓ Photo captured and uploaded');
            stopCamera();
          } catch (e) {
            console.error('Camera upload error:', e);
          }
        }, 'image/jpeg', 0.85);
      };

      const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
      };

      // Simple UI for capture (implement modal in real app)
      console.log('Camera ready. Call window.galleryApp.capturePhoto() to take picture');
      window.galleryApp.capturePhoto = capturePhoto;
      window.galleryApp.stopCamera = stopCamera;
    } catch (e) {
      console.error('Camera error:', e);
    }
  }

  goBack() {
    this.currentFolder = null;

    // Update UI
    document.getElementById('foldersList')?.classList.remove('hidden');
    document.getElementById('galleryList')?.classList.add('hidden');
    document.getElementById('backBtn').style.display = 'none';
    document.getElementById('cameraBtn').style.display = 'none';

    // Cleanup
    if (this.imageUnsubscribe) this.imageUnsubscribe();
  }

  applyLayout() {
    // Already using CSS Grid, nothing to do
    console.log('Layout updated');
  }

  cleanup() {
    this.unsubscribeFuncs.forEach(fn => fn?.());
    this.unsubscribeFuncs = [];
    if (this.imageUnsubscribe) this.imageUnsubscribe();
  }

  destroy() {
    this.cleanup();
    this.layoutDebouncer.cancel();
  }
}

// Auto-initialize
const galleryApp = new SupabaseGalleryApp();
galleryApp.init().catch(console.error);

// Export
export { SupabaseGalleryApp };
window.galleryApp = galleryApp;
