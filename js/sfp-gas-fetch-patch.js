// /js/sfp-gas-fetch-patch.js
// Auto-attach Firebase ID token to ALL fetch() calls that hit your GAS URL.
// No changes needed to your existing pages that already call fetch().

(function () {
  const origFetch = window.fetch.bind(window);

  function toUrlString(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    try { return String(input); } catch { return ''; }
  }

  function isGAS(url) {
    const u = toUrlString(url);
    const base = (window.SFP_GAS_BASE || '').trim();
    return (base && u.startsWith(base)) || u.includes('script.google.com/macros/s/');
  }

  async function withAuthHeaders(init = {}) {
    const token = await (window.SFPAuth?.getIdToken?.() || Promise.resolve(null)).catch(() => null);
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers };
  }

  window.fetch = async function (input, init = {}) {
    // Only intercept GAS calls; everything else flows through untouched.
    if (!isGAS(input)) {
      return origFetch(input, init);
    }

    // First attempt with current token
    let res = await origFetch(input, await withAuthHeaders(init));

    // If token expired, force-refresh once and retry
    if (res.status === 401 && window.SFPAuth?.getIdToken) {
      await window.SFPAuth.getIdToken(true).catch(() => null);
      res = await origFetch(input, await withAuthHeaders(init));
    }
    return res;
  };
})();
