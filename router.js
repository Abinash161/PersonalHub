// CLIENT-SIDE ROUTER - No page refresh navigation
class PageRouter {
  constructor() {
    this.currentPage = null;
    this.contentCache = {};
    this.init();
  }

  init() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
      const page = e.state?.page || 'home';
      this.loadPage(page, false);
    });

    // Get initial page from URL
    const currentPath = window.location.pathname;
    let page = 'home';
    
    if (currentPath.includes('notes')) page = 'notes';
    else if (currentPath.includes('music')) page = 'music';
    else if (currentPath.includes('gallery')) page = 'gallery';
    else if (currentPath.includes('letters')) page = 'letters';
    
    this.currentPage = page;
  }

  async loadPage(page, addToHistory = true) {
    if (this.currentPage === page) return; // Already on this page
    
    try {
      // Show loading state
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.style.opacity = '0.7';
      }

      // Fetch page content
      let content = this.contentCache[page];
      if (!content) {
        const response = await fetch(`${page}.html`);
        content = await response.text();
        
        // Extract only the main content (everything after navbar and music bar)
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const contentElement = doc.querySelector('.main-container') || 
                              doc.querySelector('main') ||
                              doc.querySelector('#main-content') ||
                              doc.body;
        
        content = contentElement.innerHTML;
        this.contentCache[page] = content;
      }

      // Update main content
      if (mainContent) {
        mainContent.innerHTML = content;
        mainContent.style.opacity = '1';
      }

      // Re-initialize page-specific scripts
      this.initPageScripts(page);

      // Update history
      if (addToHistory) {
        const url = page === 'home' ? '/' : `/${page}.html`;
        window.history.pushState({ page }, page, url);
      }

      this.currentPage = page;
      
      // Scroll to top
      window.scrollTo(0, 0);

    } catch (error) {
      console.error('Router error:', error);
      // Fallback to normal navigation
      window.location.href = `${page}.html`;
    }
  }

  initPageScripts(page) {
    // Re-run page initialization scripts after content load
    // This will be called after content is loaded
    
    // Dispatch custom event so pages can listen and initialize
    window.dispatchEvent(new CustomEvent('pageLoaded', { detail: { page } }));
  }

  navigate(page) {
    this.loadPage(page, true);
  }

  getCurrentPage() {
    return this.currentPage;
  }
}

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.router = new PageRouter();
  });
} else {
  window.router = new PageRouter();
}

// Global navigation function
function navigateTo(page) {
  if (window.router) {
    window.router.navigate(page);
  } else {
    window.location.href = `${page}.html`;
  }
}
