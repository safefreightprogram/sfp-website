// /js/load-header-footer.js  — robust header/footer loader with Alpine init
(function () {
  async function loadFragment(targetId, url) {
    const mount = document.getElementById(targetId);
    if (!mount) return null;
    const res = await fetch(url, { cache: "no-cache" });
    const html = await res.text();
    mount.innerHTML = html;
    return mount;
  }

  function ensureAlpineAndInit(rootEl) {
    function initNow() {
      try {
        if (window.Alpine && typeof window.Alpine.initTree === "function") {
          window.Alpine.initTree(rootEl);
        }
      } catch (_) {}
    }

    if (window.Alpine) {
      initNow();
      return;
    }

    // Load Alpine once
    if (!window.__sfpAlpineLoading) {
      window.__sfpAlpineLoading = true;
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js";
      s.defer = true;
      s.onload = initNow;
      document.head.appendChild(s);
    } else {
      // If another page load is already fetching Alpine, poll briefly
      const iv = setInterval(() => {
        if (window.Alpine) {
          clearInterval(iv);
          initNow();
        }
      }, 50);
      setTimeout(() => clearInterval(iv), 3000);
    }
  }

  function maybeInjectTitle(rootEl) {
    if (typeof window.injectPageTitle !== "undefined") {
      const titleContainer = rootEl.querySelector("#page-title");
      if (titleContainer) {
        titleContainer.innerHTML = `<h1>${window.injectPageTitle}</h1>`;
        titleContainer.classList.remove("hidden");
      }
    }
  }

  function ensureAccountIndicator() {
    // If header.html already included it, this is a no-op due to flag.
    if (!window.__sfpAccountLoaded) {
      const s = document.createElement("script");
      s.src = "/js/account-indicator.js";
      s.defer = true;
      s.onload = () => { window.__sfpAccountLoaded = true; };
      document.head.appendChild(s);
    }
  }

  // Kick off
  (async function init() {
    try {
      const headerEl = await loadFragment("header-placeholder", "/components/header.html");
      if (headerEl) {
        ensureAlpineAndInit(headerEl);
        maybeInjectTitle(headerEl);
        ensureAccountIndicator();
      }
    } catch (err) {
      console.error("Failed to load header:", err);
    }

    try {
      await loadFragment("footer-placeholder", "/components/footer.html");
    } catch (err) {
      console.error("Failed to load footer:", err);
    }
  })();
})();
