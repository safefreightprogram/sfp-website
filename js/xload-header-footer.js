// /js/load-header-footer.js — simple, reliable fragment loader
(function () {
 async function loadFragment(targetId, url) {
  const mount = document.getElementById(targetId);
  if (!mount) return null;

  // iOS Safari can serve stale fragments even with cache:"no-cache".
// Force a cache-busting query param + no-store.
const bust = (url.includes("?") ? "&" : "?") + "v=" + Date.now();
const res = await fetch(url + bust, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

    const html = await res.text();
  mount.innerHTML = html;

  // Tailwind CDN sometimes misses dynamically injected HTML on iOS WebKit.
  // If available, force Tailwind to re-scan and apply utilities.
  try {
    if (window.tailwind && typeof window.tailwind.refresh === "function") {
      window.tailwind.refresh();
    }
  } catch (e) {
    // no-op: styling should still degrade gracefully
  }

  return mount;
}

  function maybeInjectTitle(rootEl) {
    if (typeof window.injectPageTitle !== "undefined") {
      const titleContainer = rootEl.querySelector('#page-title');
      if (titleContainer) {
        titleContainer.innerHTML = `<h1>${window.injectPageTitle}</h1>`;
        titleContainer.classList.remove("hidden");
      }
    }
  }

  function initDropdowns(rootEl) {
    var IDS = ['sfp-dd-search', 'sfp-dd-account', 'sfp-dd-menu'];

    function panel(id) {
      return rootEl.querySelector('[data-sfp-panel="' + id + '"]');
    }

    function closeAll(exceptId) {
      IDS.forEach(function (id) {
        if (id === exceptId) return;
        var p = panel(id);
        if (p) p.classList.add('hidden');
      });
    }

    function toggle(id) {
      var p = panel(id);
      if (!p) return;
      var wasHidden = p.classList.contains('hidden');
      closeAll(null);
      if (wasHidden) {
        p.classList.remove('hidden');
        if (id === 'sfp-dd-search') {
          var inp = document.getElementById('sfp-header-search');
          if (inp) setTimeout(function () { inp.focus(); }, 50);
        }
      }
    }

    rootEl.querySelectorAll('[data-sfp-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggle(btn.getAttribute('data-sfp-toggle'));
      });
    });

    // Bubble phase (not capture) so stopPropagation on buttons works correctly
    document.addEventListener('click', function () {
      closeAll(null);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  (async function init() {
    try {
  const headerEl = await loadFragment(
  "header-placeholder",
  window.location.origin + "/components/header.html"
);
  if (headerEl) {
  maybeInjectTitle(headerEl);
  initDropdowns(headerEl);

  // WebKit (iOS Safari/Chrome) can render <details> open after dynamic injection
// or restore open state via BFCache. Force-close via the property (most reliable),
// and do it more than once to catch first-paint / restore timing.
const forceCloseDetails = () => {
  headerEl.querySelectorAll("details").forEach(d => { d.open = false; });
};

// Close immediately, then again on next paint, then after a tick.
forceCloseDetails();
requestAnimationFrame(forceCloseDetails);
setTimeout(forceCloseDetails, 0);

// Also close on BFCache restore (common on iOS).
window.addEventListener("pageshow", forceCloseDetails);
}
} catch (err) {
  console.error("Failed to load header:", err);

  // Unhide built-in fallback header if present (page-level fallback)
  const fallback = document.getElementById("site-header");
  if (fallback) fallback.classList.remove("hidden");
}
    try {
      await loadFragment(
  "footer-placeholder",
  window.location.origin + "/components/footer.html"
);
    } catch (err) {
      console.error("Failed to load footer:", err);
    }
  })();
})();
