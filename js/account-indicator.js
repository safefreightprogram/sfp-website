// /js/account-indicator.js
// Renders Log in / Sign up when logged out, and a role-aware account menu when logged in.
// Important: Header is injected asynchronously, so we WAIT until #account-indicator exists.
//
// Depends on window.SFPAuth from /js/sfp-auth.js.
// Safe to include on every page.

(function () {
  if (!window) return;

  // ----- utils -----
  function initialsFrom(name, email) {
    const s = (name || email || "?").trim();
    const parts = s.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }

  function getUser() {
    try { return (window.SFPAuth && SFPAuth.user && SFPAuth.user()) || null; }
    catch { return null; }
  }

  function getRole() {
    try { return (window.SFPAuth && SFPAuth.role && SFPAuth.role()) || "Guest"; }
    catch { return "Guest"; }
  }

  // ----- rendering -----
  function renderLoggedOut(mount) {
    mount.innerHTML = `
      <div class="flex items-center gap-2">
        <a href="/login.html" class="px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition">Log in</a>
        <a href="/signup.html" class="px-3 py-1 rounded border border-white/30 hover:bg-white/10 transition">Sign up</a>
      </div>
    `;
  }

  function attachDropdownHandlers(root) {
    const btn = root.querySelector('[data-acc="btn"]');
    const menu = root.querySelector('[data-acc="menu"]');
    if (!btn || !menu) return;

    function close() { menu.classList.add("hidden"); }
    function toggle() { menu.classList.toggle("hidden"); }

    btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  function renderLoggedIn(mount, user, role) {
    const name = user.displayName || "";
    const email = user.email || "";
    const initials = initialsFrom(name, email);
    const safeRole = (role || "Guest").toString();
    const isAdmin = safeRole.toLowerCase() === "admin";
    const isAil = ["ail", "inspector"].includes(safeRole.toLowerCase());

    mount.innerHTML = `
      <div class="relative" data-acc="root">
        <button data-acc="btn" class="inline-flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition" aria-haspopup="menu" aria-expanded="false">
          <div class="h-8 w-8 rounded-full bg-white text-blue-900 flex items-center justify-center font-semibold">${initials}</div>
          <span class="hidden sm:inline text-sm opacity-90">${name || email}</span>
        </button>

        <div data-acc="menu" class="hidden absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded shadow-xl border border-gray-200 z-50">
          <div class="px-3 py-2 border-b text-xs uppercase tracking-wide text-gray-500">Signed in</div>
          <div class="px-3 py-2 text-sm"><strong>Role:</strong> ${safeRole}</div>
          <div class="py-1 border-t"></div>
          <a href="/account.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Account</a>
          ${isAdmin ? `<a href="/admin-portal.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Admin Portal</a>` : ``}
          ${isAil ? `<a href="/ail-portal.html" class="block px-3 py-2 text-sm hover:bg-gray-100">AIL Portal</a>` : ``}
          ${isAil ? `<a href="/inspect.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Submit Inspection</a>` : ``}
          <button id="sfp-logout-btn" class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100">Log out</button>
        </div>
      </div>
    `;

    attachDropdownHandlers(mount);

    const btn = mount.querySelector("#sfp-logout-btn");
    if (btn) {
      btn.addEventListener("click", async () => {
        try {
          await SFPAuth.logout();
          const params = new URLSearchParams(window.location.search);
          const next = params.get("next") || "/index.html";
          window.location.href = next;
        } catch (e) {
          console.error("[account-indicator] Logout error:", e);
          alert("Could not log out. Please try again.");
        }
      });
    }
  }

  function sync(mount) {
    const user = getUser();
    const role = getRole();
    if (!user) return renderLoggedOut(mount);
    return renderLoggedIn(mount, user, role);
  }

  // ----- mount detection (handles async header injection) -----
  function startIfReady() {
    const mount = document.getElementById("account-indicator");
    if (!mount) return false;

    // initial render
    sync(mount);

    // update on auth changes
    window.addEventListener("sfp-auth-changed", () => sync(mount));

    return true;
  }

  // Try now; if header not present yet, observe DOM until it appears
  if (!startIfReady()) {
    const observer = new MutationObserver(() => {
      if (startIfReady()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
