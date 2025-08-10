<script>
/**
 * Usage:
 *   requireAuth();                        // any signed-in user
 *   requireAuth(['admin','ail manager']); // restrict to roles
 */
function normaliseRoles_(roles) {
  return (roles || []).map(r => r.trim().toLowerCase());
}
function getRole_() {
  try { return (SFPAuth.role?.() || 'Guest').toLowerCase(); } catch(_) { return 'guest'; }
}
function getUser_() {
  try { return SFPAuth.user?.(); } catch(_) { return null; }
}
function requireAuth(allowedRoles) {
  const user = getUser_();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `/login.html?next=${next}`;
    return false;
  }
  if (Array.isArray(allowedRoles) && allowedRoles.length) {
    const allowed = normaliseRoles_(allowedRoles);
    if (!allowed.includes(getRole_())) {
      // Soft deny → home
      location.href = `/`;
      return false;
    }
  }
  return true;
}
window.SFPGUARD = { requireAuth };
</script>
