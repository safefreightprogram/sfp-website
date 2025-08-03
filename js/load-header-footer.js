document.addEventListener('DOMContentLoaded', () => {
  // Load shared header
  fetch('components/header.html')
    .then(res => {
      if (!res.ok) throw new Error('Header not found');
      return res.text();
    })
    .then(html => {
      const headerEl = document.getElementById('header-placeholder');
      if (headerEl) {
        headerEl.innerHTML = html;

        // Inject dynamic page title after DOM is ready
        if (window.injectPageTitle) {
          requestAnimationFrame(() => {
            const titleContainer = headerEl.querySelector('#page-title');
            if (titleContainer) {
              titleContainer.innerHTML = `<h1 class="text-base sm:text-lg font-medium sm:font-semibold text-white leading-tight">${injectPageTitle}</h1>`;
            }
          });
        }
      }
    })
    .catch(err => {
      console.error('Error loading header:', err);
      const headerEl = document.getElementById('header-placeholder');
      if (headerEl) {
        headerEl.innerHTML = '<div class="bg-red-100 text-red-800 p-4">Failed to load header</div>';
      }
    });

  // Load shared footer
  fetch('components/footer.html')
    .then(res => {
      if (!res.ok) throw new Error('Footer not found');
      return res.text();
    })
    .then(html => {
      const footerEl = document.getElementById('footer-placeholder');
      if (footerEl) {
        footerEl.innerHTML = html;
      }
    })
    .catch(err => {
      console.error('Error loading footer:', err);
      const footerEl = document.getElementById('footer-placeholder');
      if (footerEl) {
        footerEl.innerHTML = '<div class="bg-red-100 text-red-800 p-4">Failed to load footer</div>';
      }
    });
});
