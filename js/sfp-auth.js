// /js/sfp-auth.js
// Firebase v10+ modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// TODO: replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBURlJUicOTobRLghN2RyEZfXEZvU_uiYU",
  authDomain: "www.safefreightportal.firebaseapp.com",
  projectId: "safefreightportal",
  appId: "1:289281705793:web:94520fbf0138a6802103c0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- ID token helper (exported) ---
async function getIdToken(forceRefresh = false) {
  const u = auth.currentUser;
  if (!u) return null;
  return await u.getIdToken(forceRefresh);
}

// --- Minimal global auth API ---
async function sfpLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await sfpAfterAuth(cred.user);
  return cred.user;
}

async function sfpSignup(email, password, displayName = "") {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  await sfpAfterAuth(cred.user);
  return cred.user;
}

async function sfpLogout() {
  localStorage.removeItem("sfpRole");
  localStorage.removeItem("sfpOrgId");
  await signOut(auth);
}

async function sfpReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// Called after login/signup to pull role once per session
async function sfpAfterAuth(user) {
  try {
    if (window.SFPApi?.postJson) {
      const data = await window.SFPApi.postJson(window.SFP_ROLES_URL || "/roles", { email: user.email });
      localStorage.setItem("sfpRole", data.role || "Guest");
      localStorage.setItem("sfpOrgId", data.orgId || "");
    } else {
      const res = await fetch(window.SFP_ROLES_URL || "/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      localStorage.setItem("sfpRole", data.role || "Guest");
      localStorage.setItem("sfpOrgId", data.orgId || "");
    }
  } catch (e) {
    console.warn("Role fetch failed, defaulting to Guest", e);
    localStorage.setItem("sfpRole", "Guest");
  }
}

function sfpGetCurrentUser() { return auth.currentUser; }
function sfpGetCurrentRole() { return localStorage.getItem("sfpRole") || "Guest"; }
function sfpGetOrgId() { return localStorage.getItem("sfpOrgId") || ""; }

onAuthStateChanged(auth, (user) => {
  window.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: { user, role: sfpGetCurrentRole() } }));
});

window.SFPAuth = {
  login: sfpLogin,
  signup: sfpSignup,
  logout: sfpLogout,
  reset: sfpReset,
  user: sfpGetCurrentUser,
  role: sfpGetCurrentRole,
  orgId: sfpGetOrgId,
  getIdToken,
  _auth: auth
};
