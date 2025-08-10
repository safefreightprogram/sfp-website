// /js/menu-enhance.js — niceties for <details> menus (Esc/click-out/close-on-nav)
(function () {
  function enhance() {
    const header = document.querySelector('header');
    if (!header) return;

    // Close all <details> in header when clicking outside
    document.addEventListener('click', (e) => {
      const details = header.querySelectorAll('details[open]');
      details.forEach(d => {
        if (!d.contains(e.target)) d.open = false;
      });
    });

    // Close on Esc
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        header.querySelectorAll('details[open]').forEach(d => d.open = false);
      }
    });

    // Close after clicking any nav link
    header.querySelectorAll('a[href]').forEach(a => {
      a.addEventListener('click', () => {
        header.querySelectorAll('details[open]').forEach(d => d.open = false);
      });
    });
  }

  function init() {
    enhance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Retry in case header was injected moments later
  setTimeout(init, 100);
})();
