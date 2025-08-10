// /js/account-indicator.js
(function () {
  const mount = document.getElementById("account-indicator");
  if (!mount) return;

  function initialsFrom(name, email) {
    const s = (name || email || "?").trim();
    const parts = s.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }

  function render(user, role) {
    if (!user) {
      mount.innerHTML = `
        <a href="/login.html" class="px-3 py-1 text-sm rounded hover:bg-white/10">Sign in</a>
      `;
      return;
    }

    const name = user.displayName || "";
    const email = user.email || "";
    const roleText = role || localStorage.getItem('sfpRole') || 'Guest';
    const isAdmin = roleText.toLowerCase().includes('admin');

    mount.innerHTML = `
      <div class="relative" x-data="{ open:false }">
        <button @click="open=!open" class="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 focus:outline-none" aria-label="Account">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
            ${initialsFrom(name, email)}
          </span>
          <span class="hidden sm:inline text-sm opacity-90">${name || email}</span>
          <svg class="h-4 w-4 opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div id="acctMenu" x-show="open" x-transition
             @click.outside="open=false"
             class="absolute right-0 mt-2 w-56 rounded-md bg-white text-gray-900 shadow-lg ring-1 ring-black/5 overflow-hidden z-50">
          <div class="px-4 py-3 border-b border-gray-100">
            <div class="text-sm font-medium">${name || email}</div>
            <div class="text-xs text-gray-600">${roleText}</div>
          </div>
          <a href="/account.html" class="block px-4 py-2 text-sm hover:bg-gray-50">Account settings</a>
          ${isAdmin ? `<a href="/admin.html" class="block px-4 py-2 text-sm hover:bg-gray-50">Admin</a>` : ``}
          <button id="sfpSignOut" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Sign out</button>
        </div>
      </div>
    `;

    // Wire sign out
    const btn = mount.querySelector("#sfpSignOut");
    btn?.addEventListener("click", async () => {
      try { await window.SFPAuth.logout(); } catch {}
      location.reload();
    });
  }

  // Initial render (in case already signed in)
  render(window.SFPAuth?.user?.(), window.SFPAuth?.role?.());

  // React to auth changes
  window.addEventListener("sfp-auth-changed", (e) => {
    render(e.detail.user, e.detail.role);
  });
})();
