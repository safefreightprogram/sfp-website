// js/load-header-footer.js

// Load header
fetch('/components/header.html')
  .then(res => res.text())
  .then(headerText => {
    const headerEl = document.getElementById('header-placeholder');
    if (!headerEl) return;

    headerEl.innerHTML = headerText;

    // Wait until DOM is updated before injecting title & loading account script
    requestAnimationFrame(() => {
      // Optional: page title injection
      if (typeof window.injectPageTitle !== 'undefined') {
        const titleContainer = headerEl.querySelector('#page-title');
        if (titleContainer) {
          titleContainer.innerHTML = `<h1>${window.injectPageTitle}</h1>`;
          titleContainer.classList.remove('hidden');
        }
      }

      // Load account indicator AFTER header exists (scripts in fetched HTML don't auto-execute)
      if (!window.__sfpAccountLoaded) {
        const s = document.createElement('script');
        s.src = '/js/account-indicator.js'; // non-module version
        s.defer = true;
        document.head.appendChild(s);
        window.__sfpAccountLoaded = true;
      }
    });
  })
  .catch(err => {
    console.error('Failed to load header:', err);
  });

// Load footer
fetch('/components/footer.html')
  .then(res => res.text())
  .then(footerText => {
    const footerEl = document.getElementById('footer-placeholder');
    if (!footerEl) return;
    footerEl.innerHTML = footerText;
  })
  .catch(err => {
    console.error('Failed to load footer:', err);
  });
