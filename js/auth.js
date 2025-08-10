<!-- Include on every page after Tailwind/Alpine, before your page scripts -->
<script type="module">
// Firebase v10+ modular SDK
// 1) Add these two scripts in <head> of your base pages (or here if you prefer):
// <script type="module" src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"></script>
// <script type="module" src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, sendPasswordResetEmail, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// TODO: replace with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Minimal global auth API (attach to window for easy use) ---
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

async function sfpAfterAuth(user) {
  // Fetch role once per session
  try {
    const res = await fetch("/api/getRole", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email })
    });
    const data = await res.json();
    // Expect { role: "Driver"|"AIL Inspector"|..., orgId: "..." }
    localStorage.setItem("sfpRole", data.role || "Guest");
    localStorage.setItem("sfpOrgId", data.orgId || "");
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
  login: sfpLogin, signup: sfpSignup, logout: sfpLogout, reset: sfpReset,
  user: sfpGetCurrentUser, role: sfpGetCurrentRole, orgId: sfpGetOrgId
};
</script>
