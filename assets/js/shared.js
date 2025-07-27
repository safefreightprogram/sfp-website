// assets/js/shared.js

// Shared utility functions
const SharedUtils = {
  // Set active navigation item
  setActiveNav: function(activePageId) {
    const navItems = document.querySelectorAll('nav a[data-active]');
    navItems.forEach(item => {
      if (item.dataset.active === activePageId) {
        item.classList.add('bg-blue-800', 'font-bold');
      } else {
        item.classList.remove('bg-blue-800', 'font-bold');
      }
    });
  },

  // Common loading state
  showLoading: function(message = 'Loading...') {
    return `
      <div class="fixed inset-0 loading-overlay flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-8 shadow-xl">
          <div class="flex items-center space-x-4">
            <div class="pulse-dot w-3 h-3 bg-blue-700 rounded-full"></div>
            <div class="pulse-dot w-3 h-3 bg-blue-700 rounded-full" style="animation-delay: 0.2s;"></div>
            <div class="pulse-dot w-3 h-3 bg-blue-700 rounded-full" style="animation-delay: 0.4s;"></div>
            <span class="text-gray-700 font-medium ml-4">${message}</span>
          </div>
        </div>
      </div>
    `;
  },

  // Load HTML components
  loadComponent: async function(componentPath, targetElement) {
    try {
      const response = await fetch(componentPath);
      if (!response.ok) throw new Error(`Failed to load ${componentPath}`);
      const html = await response.text();
      if (typeof targetElement === 'string') {
        document.querySelector(targetElement).innerHTML = html;
      } else {
        targetElement.innerHTML = html;
      }
    } catch (error) {
      console.error('Error loading component:', error);
    }
  },

  // Initialize page
  initPage: async function(pageId) {
    // Load header and footer
    await this.loadComponent('components/header.html', 'header');
    await this.loadComponent('components/footer.html', 'footer');
    
    // Set active navigation
    this.setActiveNav(pageId);
  }
};

// Initialize Alpine.js extensions
document.addEventListener('alpine:init', () => {
  // Global Alpine store for shared state
  Alpine.store('app', {
    currentPage: '',
    loading: false,
    
    setCurrentPage(page) {
      this.currentPage = page;
      SharedUtils.setActiveNav(page);
    }
  });
});

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Auto-detect page ID from URL or body class
  const path = window.location.pathname;
  const pageId = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.')) || 'index';
  
  if (typeof SharedUtils !== 'undefined') {
    SharedUtils.initPage(pageId);
  }
});
