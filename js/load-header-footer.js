// /js/load-header-footer.js — simple, reliable fragment loader
(function () {
 async function loadFragment(targetId, url) {
  const mount = document.getElementById(targetId);
  if (!mount) return null;

  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  const html = await res.text();
  mount.innerHTML = html;
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

  (async function init() {
    try {
  const headerEl = await loadFragment("header-placeholder", "/components/header.html");
  if (headerEl) maybeInjectTitle(headerEl);
} catch (err) {
  console.error("Failed to load header:", err);

  // Unhide built-in fallback header if present (page-level fallback)
  const fallback = document.getElementById("site-header");
  if (fallback) fallback.classList.remove("hidden");
}
    try {
      await loadFragment("footer-placeholder", "/components/footer.html");
    } catch (err) {
      console.error("Failed to load footer:", err);
    }
  })();
})();
