<!-- /js/account-indicator.js -->
<script>
(function () {
  function getUser() {
    try { return JSON.parse(localStorage.getItem("sfp_user") || "{}"); }
    catch { return {}; }
  }

  function render() {
    const slot = document.getElementById("account-slot");
    if (!slot) return;

    const u = getUser();
    slot.innerHTML = "";

    if (!u.email) {
      // Not logged in: show Sign in link (optional)
      const a = document.createElement("a");
      a.href = "/login.html";
      a.className = "inline-flex items-center px-3 py-2 text-sm hover:underline";
      a.textContent = "Sign in";
      slot.appendChild(a);
      return;
    }

    // Logged in: avatar + dropdown
    const wrap = document.createElement("div");
    wrap.className = "relative";
    wrap.innerHTML = `
      <button id="acctBtn" class="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10">
        ${u.photoURL ? `<img src="${u.photoURL}" alt="" class="w-7 h-7 rounded-full">`
                      : `<span class="w-7 h-7 rounded-full bg-blue-200 text-blue-800 grid place-items-center text-xs font-semibold">
                          ${(u.name || u.email || "?").charAt(0).toUpperCase()}
                        </span>`}
        <span class="hidden sm:inline text-sm">${u.name || u.email}</span>
      </button>
      <div id="acctMenu" class="hidden absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg ring-1 ring-black/5">
        <a href="/account.html" class="block px-4 py-2 text-sm hover:bg-gray-50">Account</a>
        <button onclick="SFPLogout()" class="w-full text-left block px-4 py-2 text-sm hover:bg-gray-50">Sign out</button>
      </div>
    `;
    slot.appendChild(wrap);

    const btn = wrap.querySelector("#acctBtn");
    const menu = wrap.querySelector("#acctMenu");
    btn.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) menu.classList.add("hidden");
    });
  }

  // Expose logout
  window.SFPLogout = function () {
    // Clear lightweight session (we’ll add full Firebase sign-out later)
    localStorage.removeItem("sfp_user");
    // Hard return to login
    window.location.href = "/login.html";
  };

  document.addEventListener("DOMContentLoaded", render);
})();
</script>
