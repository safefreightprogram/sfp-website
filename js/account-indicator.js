// /js/account-indicator.js  (ES module)

// Firebase (optional, for proper sign-out if available on this page)
let getAuth, signOut;
try {
  ({ getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"));
} catch (_) {
  // If Firebase isn't loaded on this page, we'll still do a local logout.
}

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
    // Not logged in: show Sign in link
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
  const initial = (u.name || u.email || "?").charAt(0).toUpperCase();
  wrap.innerHTML = `
    <button id="acctBtn" class="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10">
      ${u.photoURL
        ? `<img src="${u.photoURL}" alt="" class="w-7 h-7 rounded-full">`
        : `<span class="w-7 h-7 rounded-full bg-blue-200 text-blue-800 grid place-items-center text-xs font-semibold">${initial}</span>`
      }
      <span class="hidden sm:inline text-sm">${u.name || u.email}</span>
    </button>
    <div id="acctMenu" class="hidden absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg ring-1 ring-black/5">
      <a href="/account.html" class="block px-4 py-2 text-sm hover:bg-gray-50">Account</a>
      <button id="logoutBtn" class="w-full text-left block px-4 py-2 text-sm hover:bg-gray-50">Sign out</button>
    </div>
  `;
  slot.appendChild(wrap);

  const btn = wrap.querySelector("#acctBtn");
  const menu = wrap.querySelector("#acctMenu");
  const logoutBtn = wrap.querySelector("#logoutBtn");

  btn.addEventListener("click", () => menu.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) menu.classList.add("hidden");
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      if (getAuth && signOut) {
        const auth = getAuth();
        await signOut(auth);
      }
    } catch (e) {
      console.warn("Firebase signOut skipped:", e);
    } finally {
      localStorage.removeItem("sfp_user");
      window.location.replace("/login.html");
    }
  });
}

// Re-render when localStorage changes (e.g., login on another tab)
window.addEventListener("storage", (e) => {
  if (e.key === "sfp_user") render();
});

document.addEventListener("DOMContentLoaded", render);
