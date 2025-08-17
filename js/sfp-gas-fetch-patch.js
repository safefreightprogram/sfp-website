// /js/sfp-gas-fetch-patch.js
// Safe passthrough: DO NOT override fetch.
// This file intentionally does nothing to avoid breaking Firebase WebChannel or triggering CORS preflights.
// Keeping the file prevents 404s where it's still referenced in pages.

(() => {
  if (window.__SFP_FETCH_PATCH_ACTIVE) {
    // If an older version somehow set this, restore original fetch and disable.
    try {
      if (window.__SFP_ORIGINAL_FETCH && typeof window.__SFP_ORIGINAL_FETCH === "function") {
        window.fetch = window.__SFP_ORIGINAL_FETCH;
      }
    } catch {}
  }
  window.__SFP_FETCH_PATCH_ACTIVE = false;
  console.debug("sfp-gas-fetch-patch: disabled (no-op).");
})();
