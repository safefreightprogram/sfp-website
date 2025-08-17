// /js/sfp-auth.js
// Firebase v10+ modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  // ⬇️ use initializeFirestore instead of getFirestore
  initializeFirestore, doc, getDoc,
  disableNetwork, enableNetwork
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Firebase configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBURlJUicOTobRLghN2RyEZfXEZvU_uiYU",
  authDomain: "safe-freight-program.firebaseapp.com",
  projectId: "safe-freight-program",
  appId: "1:289281705793:web:94520fbf0138a6802103c0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ Fix WebChannel 400s behind proxies/AV by using fetch streams & auto long-polling
const db = initializeFirestore(app, {
  useFetchStreams: true,
  experimentalAutoDetectLongPolling: true
});

// ---- ID token helper (exported) ----
async function getIdToken(forceRefresh = false) {
  const u = auth.currentUser;
  if (!u) return null;
  return await u.getIdToken(forceRefresh);
}

// ---- GAS helper (simple GET, no custom headers -> no preflight) ----
function buildGASUrl(action, params = {}) {
  const base = window.SFP_GAS_BASE || "";
  if (!base) throw new Error("SFP_GAS_BASE not set");
  const url = new URL(base);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  // cache-bust to avoid intermediates
  url.searchParams.set("_ts", Date.now().toString(36));
  return url;
}

async function callGASEndpoint(action, params = {}) {
  // attach user email if signed in (helps GAS identify requester), but do not add headers
  const u = auth.currentUser;
  const merged = { ...params };
  if (u?.email && !merged.email) merged.email = u.email;

  const url = buildGASUrl(action, merged);
  const res = await fetch(url.toString(), { method: "GET" }); // no headers!

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${t.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return raw; }
}

// ---- Minimal global auth API ----
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
  // Silence Firestore chatter while logged out
  try { await disableNetwork(db); } catch {}
  await signOut(auth);
}

async function sfpReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// Called after login/signup to pull role from GAS
async function sfpAfterAuth(user) {
  try {
    console.log("🔑 Fetching user role from GAS…");
    const data = await callGASEndpoint("getRole");
    if (data && data.role) {
      localStorage.setItem("sfpRole", data.role);
      localStorage.setItem("sfpOrgId", data.orgId || "");
      console.log(`✅ Role fetched: ${data.role}, Org: ${data.orgId || "None"}`);
    } else {
      console.warn("⚠️ No role data returned from GAS, defaulting to Guest");
      localStorage.setItem("sfpRole", "Guest");
      localStorage.setItem("sfpOrgId", "");
    }
  } catch (e) {
    console.error("❌ Role fetch failed:", e);
    localStorage.setItem("sfpRole", "Guest");
    localStorage.setItem("sfpOrgId", "");
  }
}

function sfpGetCurrentUser() { return auth.currentUser; }
function sfpGetCurrentRole() { return localStorage.getItem("sfpRole") || "Guest"; }
function sfpGetOrgId() { return localStorage.getItem("sfpOrgId") || ""; }

// ---- Convenience wrappers to GAS (GET-only for now to avoid CORS) ----
async function sfpLookupDriver(driverId) {
  if (!driverId) throw new Error("driverId required");
  return callGASEndpoint("getDriverData", { id: driverId });
}

async function sfpLookupVehicle(vehicleId) {
  if (!vehicleId) throw new Error("vehicleId required");
  return callGASEndpoint("getVehicleData", { id: vehicleId });
}

// Submit inspection via GET for now (avoids preflight). If payloads grow, switch later.
async function sfpSubmitInspection(inspectionData) {
  if (!inspectionData) throw new Error("inspectionData required");
  const payload = {};
  Object.entries(inspectionData).forEach(([k, v]) => {
    payload[k] = (v && typeof v === "object") ? JSON.stringify(v) : v;
  });
  return callGASEndpoint("submitInspection", payload);
}

// Expose legacy helper API
window.SFPAuth = {
  login: sfpLogin,
  signup: sfpSignup,
  logout: sfpLogout,
  reset: sfpReset,
  user: sfpGetCurrentUser,
  role: sfpGetCurrentRole,
  orgId: sfpGetOrgId,
  getIdToken,
  _auth: auth,
  lookupDriver: sfpLookupDriver,
  lookupVehicle: sfpLookupVehicle,
  submitInspection: sfpSubmitInspection,
  callGAS: callGASEndpoint
};

// ---- Public SFP snapshot object ----
export let SFP = {
  user: null,
  roles: [],
  scopes: { ailIds: [], siteIds: [] },
  gasConnected: false
};

// ---- Auth state wiring ----
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Hard stop Firestore networking while logged out → no Listen 400 spam
    try { await disableNetwork(db); } catch {}
    SFP = {
      user: null,
      roles: [],
      scopes: { ailIds: [], siteIds: [] },
      gasConnected: false
    };
    document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: { user: null } }));
    return;
  }

  console.log("🔄 Auth state changed, updating SFP object…");

  // Enable networking now that we actually need it
  try { await enableNetwork(db); } catch {}

  // Prefer Firebase custom claims if present
  let roles = [];
  try {
    const token = await user.getIdTokenResult(true);
    roles = Array.isArray(token.claims?.roles) ? token.claims.roles : [];
    console.log("🎭 Firebase roles:", roles);
  } catch (e) {
    console.warn("⚠️ Could not fetch Firebase custom claims:", e);
  }

  // Fall back to GAS role (from localStorage set in sfpAfterAuth)
  if (roles.length === 0) {
    const gasRole = sfpGetCurrentRole();
    console.log("🎭 GAS role:", gasRole);
    if (gasRole && gasRole !== "Guest") {
      switch ((gasRole || "").toLowerCase()) {
        case "admin": roles = ["admin"]; break;
        case "ail inspector": roles = ["inspector", "ail"]; break;
        case "ail manager": roles = ["ail_manager", "inspector"]; break;
        case "driver": roles = ["driver"]; break;
        default: roles = ["guest"];
      }
    } else {
      roles = ["guest"];
    }
  }

  // One-shot scope read (no realtime listeners)
  let scopes = { ailIds: [], siteIds: [] };
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      scopes = d.scopes || scopes;
      console.log("📊 Firestore scopes:", scopes);
    }
  } catch (e) {
    console.warn("⚠️ Failed to load Firestore scopes (may not exist yet):", e);
  }

  // Quick GAS connectivity check (simple GET)
  let gasConnected = false;
  try { await callGASEndpoint("getRole"); gasConnected = true; } catch {}

  SFP = { user, roles, scopes, gasConnected };
  document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: { user } }));
  console.log("🎉 SFP object updated:", SFP);
});

// ---- Diagnostic helper ----
window.testSFPAuth = async function () {
  console.log("🧪 Testing SFP Auth system…");
  const user = auth.currentUser;
  if (!user) { console.error("❌ No user logged in"); return false; }

  console.log("👤 Current user:", user.email);
  console.log("🎭 Current role:", sfpGetCurrentRole());
  console.log("🏢 Current org:", sfpGetOrgId());
  console.log("📊 SFP object:", SFP);

  try {
    const roleData = await callGASEndpoint("getRole");
    console.log("✅ GAS role check:", roleData);

    const driverData = await sfpLookupDriver("SFPD-001234");
    console.log("✅ Driver lookup test:", driverData);

    const vehicleData = await sfpLookupVehicle("SFPV-000001");
    console.log("✅ Vehicle lookup test:", vehicleData);

    console.log("🎉 All SFP Auth tests passed!");
    return true;
  } catch (error) {
    console.error("💥 SFP Auth test failed:", error);
    return false;
  }
};

/*
 // If a corporate network still blocks fetch streams, swap the init to:
 const db = initializeFirestore(app, {
   experimentalForceLongPolling: true,
   useFetchStreams: false
 });
*/
