<script>
(function(){
  const tpl = (state)=> {
    if (state.signedIn) {
      const name = state.displayName || state.email || "Account";
      const role = state.role || "Guest";
      return `
        <button id="acctBtn" class="inline-flex items-center gap-2 p-1" aria-haspopup="menu">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 1.79-8 4v1h16v-1c0-2.21-3.58-4-8-4Z"/></svg>
          <span class="hidden sm:inline">${name}</span>
        </button>
        <div id="acctMenu" class="hidden absolute right-0 mt-2 w-56 rounded-xl bg-white text-gray-800 shadow-lg ring-1 ring-black/5">
          <div class="px-4 py-3 border-b">
            <div class="text-sm font-semibold">${name}</div>
            <div class="text-xs text-gray-500">Role: ${role}</div>
          </div>
          <a href="/account.html" class="block px-4 py-2 hover:bg-gray-50">Account settings</a>
          <button id="signOutBtn" class="w-full text-left px-4 py-2 hover:bg-gray-50">Sign out</button>
        </div>`;
    }
    // Signed out
    return `
      <a href="/login.html" class="inline-flex items-center gap-2 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6"><path fill="currentColor" d="M10 17v-2h4v2Zm-2 4h8v-2H8Zm10-4V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12h12ZM8 5h8v10H8Z"/></svg>
        <span class="hidden sm:inline">Sign in</span>
      </a>`;
  };

  function render() {
    const mount = document.getElementById("account-indicator");
    if (!mount || !window.SFPAuth) return;
    const user = SFPAuth.user?.();
    const state = {
      signedIn: !!user,
      email: user?.email || "",
      displayName: user?.displayName || "",
      role: SFPAuth.role?.() || "Guest"
    };
    mount.innerHTML = tpl(state);

    const btn = mount.querySelector("#acctBtn");
    const menu = mount.querySelector("#acctMenu");
    if (btn && menu) {
      btn.addEventListener("click", ()=> menu.classList.toggle("hidden"));
      document.addEventListener("click", (e)=> {
        if (!mount.contains(e.target)) menu.classList.add("hidden");
      });
    }
    const signOut = mount.querySelector("#signOutBtn");
    if (signOut) signOut.addEventListener("click", async ()=>{
      await SFPAuth.logout();
      render();
      window.location.href = "/";
    });
  }

  window.addEventListener("sfp-auth-changed", render);
  document.addEventListener("DOMContentLoaded", render);
})();
</script>
