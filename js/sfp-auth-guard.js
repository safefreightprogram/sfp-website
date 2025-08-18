// /js/sfp-auth-guard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "safe-freight-program.firebaseapp.com",
  projectId: "safe-freight-program",
  appId: "YOUR_APP_ID"
};

const app = window.__sfpApp || initializeApp(firebaseConfig);
if (!window.__sfpApp) window.__sfpApp = app;

const auth = getAuth();

const requiredRoles = (document.currentScript?.dataset?.requiresRole || "")
  .split(",").map(s => s.trim()).filter(Boolean); // e.g. ["inspector","admin"]

function userHasRequiredRole(claims) {
  if (!requiredRoles.length) return true; // just needs to be signed-in
  const roles = claims?.roles || claims?.role || [];
  const set = Array.isArray(roles) ? new Set(roles) : new Set([roles]);
  return requiredRoles.some(r => set.has(r));
}

function toLogin() {
  const next = encodeURIComponent(location.href);
  location.replace(`/login.html?next=${next}`);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return toLogin();

  try {
    const res = await getIdTokenResult(user, true); // force refresh to get fresh claims
    if (!userHasRequiredRole(res.claims)) {
      location.replace("/no-access.html");
      return;
    }
    // Make token available for API calls
    window.SFP_CURRENT_USER = { uid: user.uid, idToken: res.token, claims: res.claims };
  } catch (err) {
    console.error("Auth guard error:", err);
    toLogin();
  }
});
