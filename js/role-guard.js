// /js/role-guards.js — toggles [data-requires-role="admin"] based on role text
(function () {
  function applyRoleGuards(roleText) {
    const isAdmin = (roleText || '').toLowerCase().includes('admin');
    document.querySelectorAll('[data-requires-role="admin"]').forEach(el => {
      el.classList.toggle('hidden', !isAdmin);
    });
  }

  // From cached role (if present)
  applyRoleGuards(localStorage.getItem('sfpRole'));

  // Live updates from your auth layer
  window.addEventListener("sfp-auth-changed", (e) => {
    const nextRole = (e && e.detail && e.detail.role) || '';
    // Cache it for page reloads
    try { localStorage.setItem('sfpRole', nextRole); } catch (_) {}
    applyRoleGuards(nextRole);
  });
})();
