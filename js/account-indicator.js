// /js/account-indicator.js
// Single icon that opens a dropdown in BOTH states.
// - Logged out: dropdown shows "Log in" and "Sign up"
// - Logged in: dropdown shows Account / role links / Log out
// Works with injected header (waits for #account-indicator to appear).

(function () {
  // ---------- utils ----------
  function $(sel, root = document) { return root.querySelector(sel); }
  function on(el, ev, fn, opts) { el && el.addEventListener(ev, fn, opts); }

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

  // ---------- rendering ----------
  function baseButtonHtml(inner) {
    return `
      <button data-acc="btn"
              class="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-haspopup="menu" aria-expanded="false" aria-label="Account">
        ${inner}
      </button>
    `;
  }

  function personIconSvg() {
    // Generic person glyph (used for logged-out icon)
    return `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/>
      </svg>
    `;
  }

  function avatarHtml(user) {
    const initials = initialsFrom(user?.displayName || "", user?.email || "");
    return `<div class="h-8 w-8 rounded-full bg-white text-blue-900 flex items-center justify-center font-semibold text-sm">${initials}</div>`;
  }

  function dropdownWrapper(inner) {
    return `
      <div class="relative" data-acc="root">
        ${inner}
        <div data-acc="menu"
             class="hidden absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded shadow-xl border border-gray-200 z-50">
          <!-- items injected below -->
        </div>
      </div>
    `;
  }

  function renderLoggedOut(mount) {
    mount.innerHTML = dropdownWrapper(baseButtonHtml(personIconSvg()));
    const root = mount.querySelector('[data-acc="root"]');
    const menu = mount.querySelector('[data-acc="menu"]');

    // menu items
    menu.innerHTML = `
      <a href="/login.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Log in</a>
      <a href="/signup.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Sign up</a>
    `;

    attachDropdownHandlers(root);
  }

  function renderLoggedIn(mount, user, role) {
    const safeRole = (role || "Guest").toString();
    const isAdmin = safeRole.toLowerCase() === "admin";
    const isAil = ["ail", "inspector"].includes(safeRole.toLowerCase());

    mount.innerHTML = dropdownWrapper(baseButtonHtml(avatarHtml(user)));
    const root = mount.querySelector('[data-acc="root"]');
    const menu = mount.querySelector('[data-acc="menu"]');

    menu.innerHTML = `
      <div class="px-3 py-2 border-b text-xs uppercase tracking-wide text-gray-500">Signed in</div>
      <div class="px-3 py-2 text-sm"><strong>Role:</strong> ${safeRole}</div>
      <div class="py-1 border-t"></div>
      <a href="/account.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Account</a>
      ${isAdmin ? `<a href="/admin-portal.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Admin Portal</a>` : ``}
      ${isAil ? `<a href="/ail-portal.html" class="block px-3 py-2 text-sm hover:bg-gray-100">AIL Portal</a>` : ``}
      ${isAil ? `<a href="/inspect.html" class="block px-3 py-2 text-sm hover:bg-gray-100">Submit Inspection</a>` : ``}
      <button id="sfp-logout-btn" class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100">Log out</button>
    `;

    attachDropdownHandlers(root);

    const btn = menu.querySelector("#sfp-logout-btn");
    on(btn, "click", async () => {
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

  function attachDropdownHandlers(root) {
    const btn = root.querySelector('[data-acc="btn"]');
    const menu = root.querySelector('[data-acc="menu"]');
    if (!btn || !menu) return;

    function close() { menu.classList.add("hidden"); }
    function toggle() { menu.classList.toggle("hidden"); }

    on(btn, "click", (e) => { e.stopPropagation(); toggle(); });
    on(document, "click", close);
    on(document, "keydown", (e) => { if (e.key === "Escape") close(); });
  }

  function sync(mount) {
    const user = getUser();
    const role = getRole();
    if (!user) return renderLoggedOut(mount);
    return renderLoggedIn(mount, user, role);
  }

  // ---------- mount detection (header is injected asynchronously) ----------
 function startIfReady() {
  const mounts = [
    $("#account-indicator"),
    $("#account-indicator-mobile"),
  ].filter(Boolean);

  if (mounts.length === 0) return false;

  function syncAll() {
    mounts.forEach(sync);
  }

  syncAll();
  // keep in sync on auth changes
  window.addEventListener("sfp-auth-changed", syncAll);
  return true;
}

  if (!startIfReady()) {
    const observer = new MutationObserver(() => {
      if (startIfReady()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
